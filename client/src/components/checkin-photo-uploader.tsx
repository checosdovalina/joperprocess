import { useMemo, useEffect } from "react";
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

  const uppy = useMemo(() => {
    const uppyInstance = new Uppy({
      restrictions: {
        maxNumberOfFiles: Math.max(0, remainingSlots),
        allowedFileTypes: ["image/*"],
        maxFileSize: 5 * 1024 * 1024, // 5MB
      },
      autoProceed: false,
    });

    //  Prefetch presigned URL when file is added
    uppyInstance.on("file-added", async (file) => {
      try {
        const response = await fetch("/api/objects/upload", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ checkinId }),
        });

        const data = await response.json();
        
        // Store both URL and entityId in file meta
        uppyInstance.setFileMeta(file.id, {
          uploadURL: data.uploadURL,
          entityId: data.entityId,
        });
      } catch (error) {
        console.error("Error getting upload URL:", error);
        toast({
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
        // Guard against array (bundle mode)
        if (Array.isArray(file)) {
          throw new Error("Bundle mode not supported");
        }

        // Return pre-fetched URL synchronously
        const uploadURL = file.meta?.uploadURL as string;
        if (!uploadURL) {
          throw new Error("Upload URL not found in file meta");
        }
        // For relative URLs (local storage), prepend origin
        if (uploadURL.startsWith('/')) {
          return window.location.origin + uploadURL;
        }
        return uploadURL;
      },
      // Headers for local uploads need credentials
      headers: (file) => {
        const uploadURL = file.meta?.uploadURL as string;
        // Only set headers for local uploads
        if (uploadURL?.startsWith('/')) {
          return {
            'Content-Type': file.type || 'image/jpeg',
          };
        }
        return {};
      },
      // Handle both GCS and local responses
      getResponseData: () => {
        // Return a valid response object - upload succeeded if we get here
        return { url: "uploaded" };
      },
    });

    uppyInstance.on("upload-success", async (file) => {
      if (!file) return;

      try {
        const entityId = file.meta?.entityId as string;

        if (!entityId) {
          throw new Error("No entity ID found");
        }

        await apiRequest("PUT", "/api/checkin-photos", {
          checkinId,
          entityId,
        });

        await queryClient.invalidateQueries({
          queryKey: [`/api/checkins/${checkinId}`],
        });

        toast({
          title: "Foto cargada",
          description: `${file.name} se cargó correctamente`,
        });

        onUploadSuccess?.();
      } catch (error) {
        console.error("Error saving photo to checkin:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudo guardar la foto. Inténtalo de nuevo.",
        });
      }
    });

    uppyInstance.on("upload-error", (file, error) => {
      if (!file) return;

      console.error("Upload error:", error);
      toast({
        variant: "destructive",
        title: "Error al cargar",
        description: `No se pudo cargar ${file.name}`,
      });
    });

    return uppyInstance;
  }, [checkinId, remainingSlots, toast, onUploadSuccess, currentPhotoCount]);

  // Mount Dashboard plugin
  useEffect(() => {
    if (!uppy) return;

    uppy.use(Dashboard, {
      target: `#uppy-dashboard-${checkinId}`,
      inline: true,
      height: 300,
      proudlyDisplayPoweredByUppy: false,
      note: `Máximo ${remainingSlots} foto${remainingSlots > 1 ? "s" : ""} más (hasta 5MB cada una)`,
    });

    return undefined;
  }, [uppy, checkinId, remainingSlots]);

  useEffect(() => {
    return () => {
      if (uppy) {
        uppy.cancelAll();
      }
    };
  }, [uppy]);

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
