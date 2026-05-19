import { useRef, useEffect } from "react";
import Uppy from "@uppy/core";
import Dashboard from "@uppy/dashboard";
import XHRUpload from "@uppy/xhr-upload";
import "@uppy/core/css/style.min.css";
import "@uppy/dashboard/css/style.min.css";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface CheckinPhotoUploaderProps {
  checkinId: string;
  currentPhotoCount: number;
  onUploadSuccess?: () => void;
}

const MAX_DIMENSION = 1920;
const COMPRESS_QUALITY = 0.75;
const COMPRESS_THRESHOLD = 1.5 * 1024 * 1024;

async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.size < COMPRESS_THRESHOLD) {
    return file;
  }
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
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
  const maxPhotos = 6;
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
          title: "Error",
          description: "No se pudo preparar el archivo para carga",
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
          title: "Foto cargada",
          description: `${file.name} se cargó correctamente`,
        });
        onUploadSuccessRef.current?.();
      } catch (error) {
        console.error("Error saving photo to checkin:", error);
        toastRef.current({
          variant: "destructive",
          title: "Error",
          description: "No se pudo guardar la foto. Inténtalo de nuevo.",
        });
      }
    });

    uppyInstance.on("upload-error", (file, error) => {
      if (!file) return;
      console.error("Upload error:", error);
      toastRef.current({
        variant: "destructive",
        title: "Error al cargar",
        description: `No se pudo cargar ${file.name}. Verifica tu conexión e intenta de nuevo.`,
      });
    });

    uppyInstance.use(Dashboard, {
      target: container,
      inline: true,
      height: 300,
      proudlyDisplayPoweredByUppy: false,
      note: "Máximo 6 fotos. Las fotos grandes se comprimen automáticamente.",
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
        Ya has alcanzado el máximo de 6 fotos para este check-in
      </div>
    );
  }

  return (
    <div ref={containerRef} data-testid="uploader-photos" />
  );
}
