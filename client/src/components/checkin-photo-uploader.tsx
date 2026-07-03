import { useRef, useEffect } from "react";
import Uppy from "@uppy/core";
import Dashboard from "@uppy/dashboard";
import XHRUpload from "@uppy/xhr-upload";
import "@uppy/core/css/style.min.css";
import "@uppy/dashboard/css/style.min.css";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/hooks/use-i18n";

interface CheckinPhotoUploaderProps {
  checkinId: string;
  currentPhotoCount: number;
  onUploadSuccess?: () => void;
}

const MAX_DIMENSION = 1280;
const COMPRESS_QUALITY = 0.78;

async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      const needsResize = width > MAX_DIMENSION || height > MAX_DIMENSION;
      if (needsResize) {
        const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(file); return; }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return; }
          const compressed = new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
            type: "image/jpeg",
            lastModified: Date.now(),
          });
          console.log(`Compressed ${file.name}: ${(file.size / 1024).toFixed(0)}KB → ${(compressed.size / 1024).toFixed(0)}KB`);
          resolve(compressed);
        },
        "image/jpeg",
        COMPRESS_QUALITY
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

export function CheckinPhotoUploader({
  checkinId,
  currentPhotoCount,
  onUploadSuccess,
}: CheckinPhotoUploaderProps) {
  const { toast } = useToast();
  const { t } = useI18n();
  const maxPhotos = 20;
  const remainingSlots = maxPhotos - currentPhotoCount;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const uppyRef = useRef<Uppy | null>(null);
  const toastRef = useRef(toast);
  const onUploadSuccessRef = useRef(onUploadSuccess);

  toastRef.current = toast;
  onUploadSuccessRef.current = onUploadSuccess;

  // Update restrictions when remainingSlots changes without recreating Uppy
  useEffect(() => {
    if (uppyRef.current) {
      uppyRef.current.setOptions({
        restrictions: {
          maxNumberOfFiles: Math.max(0, remainingSlots),
          allowedFileTypes: ["image/*"],
          maxFileSize: 10 * 1024 * 1024,
        },
      });
    }
  }, [remainingSlots]);

  // Create Uppy instance once — triggered when containerRef is available
  useEffect(() => {
    const container = containerRef.current;
    if (!container || uppyRef.current) return;

    const uppyInstance = new Uppy({
      restrictions: {
        maxNumberOfFiles: Math.max(0, remainingSlots),
        allowedFileTypes: ["image/*"],
        maxFileSize: 10 * 1024 * 1024,
      },
      autoProceed: false,
    });

    uppyInstance.on("file-added", async (file) => {
      try {
        if (file.data instanceof File || file.data instanceof Blob) {
          const originalFile = file.data instanceof File
            ? file.data
            : new File([file.data], file.name || "photo.jpg", { type: file.type || "image/jpeg" });

          const compressed = await compressImage(originalFile);
          if (compressed !== originalFile) {
            uppyInstance.setFileState(file.id, {
              data: compressed,
              size: compressed.size,
              type: compressed.type,
            });
          }
        }

        const response = await fetch("/api/objects/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ checkinId }),
        });
        const data = await response.json();
        uppyInstance.setFileMeta(file.id, {
          uploadURL: data.uploadURL,
          entityId: data.entityId,
        });
      } catch (error) {
        console.error("Error preparing file for upload:", error);
        toastRef.current({
          variant: "destructive",
          title: t("label.error"),
          description: t("photos.prepare-error"),
        });
        uppyInstance.removeFile(file.id);
      }
    });

    uppyInstance.use(XHRUpload, {
      method: "PUT",
      formData: false,
      withCredentials: true,
      timeout: 60000,
      endpoint: (file) => {
        if (Array.isArray(file)) throw new Error("Bundle mode not supported");
        const uploadURL = file.meta?.uploadURL as string;
        if (!uploadURL) throw new Error("Upload URL not found in file meta");
        if (uploadURL.startsWith("/")) return window.location.origin + uploadURL;
        return uploadURL;
      },
      headers: (file) => {
        const uploadURL = file.meta?.uploadURL as string;
        if (uploadURL?.startsWith("/")) {
          return { "Content-Type": file.type || "image/jpeg" };
        }
        return {};
      },
      getResponseData: () => ({ url: "uploaded" }),
    });

    uppyInstance.on("upload-success", async (file) => {
      if (!file) return;
      try {
        const entityId = file.meta?.entityId as string;
        if (!entityId) throw new Error("No entity ID found");

        await apiRequest("PUT", "/api/checkin-photos", { checkinId, entityId });
        await queryClient.invalidateQueries({ queryKey: [`/api/checkins/${checkinId}`] });

        toastRef.current({
          title: t("photos.uploaded-title"),
          description: `${file.name} ${t("photos.uploaded-suffix")}`,
        });
        onUploadSuccessRef.current?.();
      } catch (error) {
        console.error("Error saving photo to checkin:", error);
        toastRef.current({
          variant: "destructive",
          title: t("label.error"),
          description: t("photos.save-error"),
        });
      }
    });

    uppyInstance.on("upload-error", (file, error) => {
      if (!file) return;
      console.error("Upload error:", error);
      toastRef.current({
        variant: "destructive",
        title: t("label.error"),
        description: `${t("photos.upload-error-prefix")} ${file.name}. ${t("photos.upload-error-suffix")}`,
      });
    });

    uppyInstance.use(Dashboard, {
      target: container,
      inline: true,
      height: 300,
      proudlyDisplayPoweredByUppy: false,
      note: t("photos.max-note"),
    });

    uppyRef.current = uppyInstance;

    return () => {
      uppyInstance.cancelAll();
      uppyInstance.destroy();
      uppyRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkinId]);

  if (remainingSlots <= 0) {
    return (
      <div className="text-center py-6 text-muted-foreground" data-testid="text-max-photos">
        {t("photos.max-reached")}
      </div>
    );
  }

  return (
    <div ref={containerRef} data-testid="uploader-photos" />
  );
}
