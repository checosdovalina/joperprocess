import { useState } from "react";
import { useI18n } from "@/hooks/use-i18n";
import { useQuery, useMutation } from "@tanstack/react-query";
import { User, UserRole, type Empresa } from "@shared/schema";
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
import { Users, UserCheck, UserX, UserPlus, Pencil } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function UsersPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editData, setEditData] = useState({
    fullName: "",
    email: "",
    role: "",
    newPassword: "",
    empresaId: "none",
    receiveEmailNotifications: true,
  });
  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
    fullName: "",
    email: "",
    role: UserRole.VENDEDOR as string,
    empresaId: "none",
    receiveEmailNotifications: true,
  });

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: empresas = [] } = useQuery<Empresa[]>({
    queryKey: ["/api/empresas"],
  });

  const createUserMutation = useMutation({
    mutationFn: async (userData: typeof newUser) => {
      const { empresaId, ...rest } = userData;
      const res = await apiRequest("POST", "/api/register", {
        ...rest,
        active: true,
        receiveEmailNotifications: newUser.receiveEmailNotifications,
        empresaId: empresaId === "none" ? null : empresaId,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: t("users.toast.created"),
        description: t("users.toast.created-desc"),
      });
      setIsCreateDialogOpen(false);
      setNewUser({
        username: "",
        password: "",
        fullName: "",
        email: "",
        role: UserRole.VENDEDOR,
        empresaId: "none",
        receiveEmailNotifications: true,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || t("users.toast.create-error"),
        variant: "destructive",
      });
    },
  });

  const toggleUserMutation = useMutation({
    mutationFn: async ({ userId, active }: { userId: string; active: boolean }) => {
      const res = await apiRequest("PATCH", `/api/users/${userId}`, { active });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: t("users.toast.updated"),
        description: t("users.toast.status-desc"),
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

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: typeof editData }) => {
      const payload: Record<string, string | boolean | null> = {
        fullName: data.fullName,
        email: data.email,
        role: data.role,
        empresaId: data.empresaId === "none" ? null : data.empresaId,
        receiveEmailNotifications: data.receiveEmailNotifications,
      };
      if (data.newPassword.trim()) {
        payload.password = data.newPassword.trim();
      }
      const res = await apiRequest("PATCH", `/api/users/${userId}`, payload);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: t("users.toast.updated"),
        description: t("users.toast.updated-desc"),
      });
      setIsEditDialogOpen(false);
      setEditingUser(null);
      setEditData({
        fullName: "",
        email: "",
        role: "",
        newPassword: "",
        empresaId: "none",
        receiveEmailNotifications: true,
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

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setEditData({
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      newPassword: "",
      empresaId: user.empresaId ?? "none",
      receiveEmailNotifications: user.receiveEmailNotifications !== false,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      updateUserMutation.mutate({ userId: editingUser.id, data: editData });
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: t("role.admin"),
      vendedor: t("role.vendedor"),
      credito_cobranza: t("role.credito_cobranza"),
      ventas_logistica: t("role.ventas_logistica"),
      fabrica: t("role.fabrica"),
      embarques: t("role.embarques"),
      facturacion: t("role.facturacion"),
    };
    return labels[role] || role;
  };

  const roleOptions = [
    { value: UserRole.VENDEDOR, label: t("role.vendedor") },
    { value: UserRole.CREDITO_COBRANZA, label: t("role.credito_cobranza") },
    { value: UserRole.VENTAS_LOGISTICA, label: t("role.ventas_logistica") },
    { value: UserRole.FABRICA, label: t("role.fabrica") },
    { value: UserRole.EMBARQUES, label: t("role.embarques") },
    { value: UserRole.FACTURACION, label: t("role.facturacion") },
    { value: UserRole.ADMIN, label: t("role.admin") },
  ];

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    createUserMutation.mutate(newUser);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("users.title")}</h1>
          <p className="text-muted-foreground mt-1">
            {t("users.subtitle")}
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-user">
              <UserPlus className="mr-2 h-4 w-4" />
              {t("users.create")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t("users.create")}</DialogTitle>
              <DialogDescription>
                {t("users.create-desc")}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-fullName">{t("users.form.full-name")}</Label>
                <Input
                  id="new-fullName"
                  data-testid="input-new-fullname"
                  type="text"
                  value={newUser.fullName}
                  onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-email">{t("users.form.email")}</Label>
                <Input
                  id="new-email"
                  data-testid="input-new-email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-username">{t("users.form.username")}</Label>
                <Input
                  id="new-username"
                  data-testid="input-new-username"
                  type="text"
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">{t("users.form.password")}</Label>
                <Input
                  id="new-password"
                  data-testid="input-new-password"
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-role">{t("users.form.role")}</Label>
                <Select
                  value={newUser.role}
                  onValueChange={(value) => setNewUser({ ...newUser, role: value })}
                >
                  <SelectTrigger id="new-role" data-testid="select-new-role">
                    <SelectValue placeholder={t("users.form.select-role")} />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {empresas.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="new-empresa">Empresa</Label>
                  <Select
                    value={newUser.empresaId}
                    onValueChange={(value) => setNewUser({ ...newUser, empresaId: value })}
                  >
                    <SelectTrigger id="new-empresa" data-testid="select-new-empresa">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Todas las empresas</SelectItem>
                      {empresas.map((empresa) => (
                        <SelectItem key={empresa.id} value={empresa.id}>
                          {empresa.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Los vendedores solo verán su empresa asignada. Deja "Todas" para roles internos.
                  </p>
                </div>
              )}
              <div className="flex items-start gap-3">
                <Checkbox
                  id="new-receive-email-notifications"
                  checked={newUser.receiveEmailNotifications}
                  onCheckedChange={(checked) =>
                    setNewUser({ ...newUser, receiveEmailNotifications: checked === true })
                  }
                  data-testid="checkbox-new-receive-email-notifications"
                />
                <Label htmlFor="new-receive-email-notifications" className="text-sm leading-snug cursor-pointer">
                  Recibir notificaciones automáticas por correo
                </Label>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                  data-testid="button-cancel-create"
                >
                  {t("btn.cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={createUserMutation.isPending}
                  data-testid="button-submit-create"
                >
                  {createUserMutation.isPending ? t("btn.creating") : t("users.create")}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("users.total")}</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("users.active")}</CardTitle>
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
            <CardTitle className="text-sm font-medium">{t("users.inactive")}</CardTitle>
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
          <CardTitle>{t("users.all")}</CardTitle>
          <CardDescription>
            {users?.length || 0} {t("users.registered-desc")}
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
                    <TableHead>{t("users.col.username")}</TableHead>
                    <TableHead>{t("users.col.full-name")}</TableHead>
                    <TableHead>{t("users.col.email")}</TableHead>
                    <TableHead>{t("users.col.role")}</TableHead>
                    {empresas.length > 0 && <TableHead>Empresa</TableHead>}
                    <TableHead>{t("label.status")}</TableHead>
                    <TableHead className="text-right">{t("label.actions")}</TableHead>
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
                      {empresas.length > 0 && (
                        <TableCell>
                          {user.empresaId ? (
                            <Badge variant="secondary" data-testid={`badge-empresa-${user.id}`}>
                              {empresas.find((e) => e.id === user.empresaId)?.name ?? "—"}
                            </Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">Todas</span>
                          )}
                        </TableCell>
                      )}
                      <TableCell>
                        {user.active ? (
                          <Badge className="bg-green-100 text-green-800" data-testid={`status-active-${user.id}`}>
                            {t("status.active")}
                          </Badge>
                        ) : (
                          <Badge variant="destructive" data-testid={`status-inactive-${user.id}`}>
                            {t("status.inactive")}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleEditUser(user)}
                            data-testid={`button-edit-user-${user.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
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
                            {user.active ? t("btn.deactivate") : t("btn.activate")}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">{t("users.no-results")}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("users.edit")}</DialogTitle>
            <DialogDescription>
              {t("users.edit-desc")}: {editingUser?.username}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateUser} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-fullName">Nombre Completo</Label>
              <Input
                id="edit-fullName"
                data-testid="input-edit-fullname"
                type="text"
                value={editData.fullName}
                onChange={(e) => setEditData({ ...editData, fullName: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">{t("users.form.email")}</Label>
              <Input
                id="edit-email"
                data-testid="input-edit-email"
                type="email"
                value={editData.email}
                onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role">Rol</Label>
              <Select
                value={editData.role}
                onValueChange={(value) => setEditData({ ...editData, role: value })}
              >
                <SelectTrigger id="edit-role" data-testid="select-edit-role">
                  <SelectValue placeholder={t("users.form.select-role")} />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {empresas.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="edit-empresa">Empresa</Label>
                <Select
                  value={editData.empresaId}
                  onValueChange={(value) => setEditData({ ...editData, empresaId: value })}
                >
                  <SelectTrigger id="edit-empresa" data-testid="select-edit-empresa">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Todas las empresas</SelectItem>
                    {empresas.map((empresa) => (
                      <SelectItem key={empresa.id} value={empresa.id}>
                        {empresa.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Los vendedores solo verán su empresa asignada. Deja "Todas" para roles internos.
                </p>
              </div>
            )}
            <div className="flex items-start gap-3">
              <Checkbox
                id="edit-receive-email-notifications"
                checked={editData.receiveEmailNotifications}
                onCheckedChange={(checked) =>
                  setEditData({ ...editData, receiveEmailNotifications: checked === true })
                }
                data-testid="checkbox-edit-receive-email-notifications"
              />
              <Label htmlFor="edit-receive-email-notifications" className="text-sm leading-snug cursor-pointer">
                Recibir notificaciones automáticas por correo
              </Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-newPassword">{t("users.form.new-password")} <span className="text-muted-foreground text-xs">{t("users.form.password-hint")}</span></Label>
              <Input
                id="edit-newPassword"
                data-testid="input-edit-password"
                type="password"
                value={editData.newPassword}
                onChange={(e) => setEditData({ ...editData, newPassword: e.target.value })}
                placeholder="••••••"
                autoComplete="new-password"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                data-testid="button-cancel-edit"
              >
                {t("btn.cancel")}
              </Button>
              <Button
                type="submit"
                disabled={updateUserMutation.isPending}
                data-testid="button-submit-edit"
              >
                {updateUserMutation.isPending ? t("btn.saving") : t("btn.save-changes")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
