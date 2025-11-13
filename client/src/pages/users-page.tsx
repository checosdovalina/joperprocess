import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { User, UserRole } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, UserCheck, UserX } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

export default function UsersPage() {
  const { toast } = useToast();

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const toggleUserMutation = useMutation({
    mutationFn: async ({ userId, active }: { userId: string; active: boolean }) => {
      const res = await apiRequest("PATCH", `/api/users/${userId}`, { active });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Usuario actualizado",
        description: "El estado del usuario ha sido modificado",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: "Administrador",
      vendedor: "Vendedor",
      credito_cobranza: "Crédito y Cobranza",
      ventas_logistica: "Ventas/Logística",
      fabrica: "Fábrica",
      embarques: "Embarques",
      facturacion: "Facturación",
    };
    return labels[role] || role;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Administración de Usuarios</h1>
        <p className="text-muted-foreground mt-1">
          Gestiona usuarios, roles y permisos del sistema
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activos</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users?.filter((u) => u.active).length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactivos</CardTitle>
            <UserX className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users?.filter((u) => !u.active).length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Todos los Usuarios</CardTitle>
          <CardDescription>
            {users?.length || 0} usuarios registrados en el sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : users && users.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Nombre Completo</TableHead>
                    <TableHead>Correo</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id} className="hover-elevate" data-testid={`row-user-${user.id}`}>
                      <TableCell>
                        <div className="font-medium">{user.username}</div>
                      </TableCell>
                      <TableCell>
                        <div>{user.fullName}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{getRoleLabel(user.role)}</Badge>
                      </TableCell>
                      <TableCell>
                        {user.active ? (
                          <Badge className="bg-green-100 text-green-800" data-testid={`status-active-${user.id}`}>
                            Activo
                          </Badge>
                        ) : (
                          <Badge variant="destructive" data-testid={`status-inactive-${user.id}`}>
                            Inactivo
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            toggleUserMutation.mutate({
                              userId: user.id,
                              active: !user.active,
                            })
                          }
                          disabled={toggleUserMutation.isPending}
                          data-testid={`button-toggle-user-${user.id}`}
                        >
                          {user.active ? "Desactivar" : "Activar"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No hay usuarios registrados</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
