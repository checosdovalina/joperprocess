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

export function CheckinPhotoUploader({
  checkinId,
  currentPhotoCount,
  onUploadSuccess,
}: CheckinPhotoUploaderProps) {
  const { toast } = useToast();
  const maxPhotos = 6;
  const remainingSlots = maxPhotos - currentPhotoCount;

  const uppyRef = useRef<Uppy | null>(null);
  const mountedRef = useRef(false);
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
          maxFileSize: 5 * 1024 * 1024,
        },
      });
    }
  }, [remainingSlots]);

  // Create Uppy instance once per checkinId
  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;

    const uppyInstance = new Uppy({
      restrictions: {
        maxNumberOfFiles: Math.max(0, remainingSlots),
        allowedFileTypes: ["image/*"],
        maxFileSize: 5 * 1024 * 1024,
      },
      autoProceed: false,
    });

    uppyInstance.on("file-added", async (file) => {
      try {
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
        console.error("Error getting upload URL:", error);
        toastRef.current({
          variant: "destructive",
          title: "Error",
          description: "No se pudo obtener URL de carga",
        });
        uppyInstance.removeFile(file.id);
      }
    });

    uppyInstance.use(XHRUpload, {
      method: "PUT",
      formData: false,
      withCredentials: true,
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
        description: `No se pudo cargar ${file.name}`,
      });
    });

    uppyInstance.use(Dashboard, {
      target: `#uppy-dashboard-${checkinId}`,
      inline: true,
      height: 300,
      proudlyDisplayPoweredByUppy: false,
      note: `Máximo 6 fotos (hasta 5MB cada una)`,
    });

    uppyRef.current = uppyInstance;

    return () => {
      uppyInstance.cancelAll();
      uppyInstance.destroy();
      uppyRef.current = null;
      mountedRef.current = false;
    };
  }, [checkinId]);

  if (remainingSlots <= 0) {
    return (
      <div className="text-center py-6 text-muted-foreground" data-testid="text-max-photos">
        Ya has alcanzado el máximo de 6 fotos para este check-in
      </div>
    );
  }

  return (
    <div data-testid="uploader-photos">
      <div id={`uppy-dashboard-${checkinId}`} />
    </div>
  );
}
