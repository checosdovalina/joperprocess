import { useQuery, useMutation, UseQueryOptions } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function useEntityQuery<T>(
  endpoint: string,
  options?: Omit<UseQueryOptions<T, Error>, "queryKey" | "queryFn">
) {
  return useQuery<T, Error>({
    queryKey: [endpoint],
    ...options,
  });
}

export function useEntityMutation<TData, TVariables = TData>({
  endpoint,
  method = "POST",
  successMessage,
  invalidateQueries,
  onSuccessCallback,
}: {
  endpoint: string;
  method?: "POST" | "PUT" | "PATCH" | "DELETE";
  successMessage?: string;
  invalidateQueries?: string[];
  onSuccessCallback?: (data: TData) => void;
}) {
  const { toast } = useToast();

  return useMutation<TData, Error, TVariables>({
    mutationFn: async (data: TVariables) => {
      const res = await apiRequest(method, endpoint, data);
      return await res.json();
    },
    onSuccess: (data) => {
      if (invalidateQueries) {
        invalidateQueries.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: [key] });
        });
      }
      if (successMessage) {
        toast({
          title: "Éxito",
          description: successMessage,
        });
      }
      if (onSuccessCallback) {
        onSuccessCallback(data);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
