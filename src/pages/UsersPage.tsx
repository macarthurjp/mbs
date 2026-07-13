import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ElementType, FormEvent } from 'react';
import {
  AlertCircle,
  Building2,
  ChevronDown,
  Crown,
  Edit2,
  Eye,
  EyeOff,
  Search,
  Shield,
  ShoppingBag,
  Trash2,
  UserPlus,
  Users
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { supabase } from '../lib/supabase';
import { useNotification } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';
import { formatArgentinaDate } from '../utils/dateHelpers';
import { useLanguage } from '../contexts/LanguageContext';
import { getUserRoleFlags } from '../utils/roles';
import { logAudit } from '../utils/audit';
import { formatEmail } from '../utils/formatContact';

type UserRole = 'super_admin' | 'owner' | 'admin' | 'seller';

const USERS_PER_PAGE = 12;

const usersCopy = {
  es: {
    title: 'Usuarios',
    subtitle: 'Gestión de usuarios, roles y accesos de la plataforma',
    restrictedTitle: 'Acceso restringido',
    restrictedSellerText: 'Los vendedores no tienen acceso al módulo de usuarios.',
    newUser: 'Nuevo Usuario',
    loadingUsers: 'Cargando usuarios...',
    noUsers: 'No hay usuarios registrados',
    searchPlaceholder: 'Buscar por nombre, email, usuario, negocio o rol...',
    totalUsers: 'Total usuarios',
    admins: 'Administradores',
    sellers: 'Vendedores',
    protectedUsers: 'Protegidos',
    page: 'Página',
    previous: 'Anterior',
    next: 'Siguiente',
    of: 'de',
    user: 'Usuario',
    business: 'Negocio',
    role: 'Rol',
    created: 'Creado',
    actions: 'Acciones',
    edit: 'Editar',
    delete: 'Eliminar',
    selectedUser: 'Usuario seleccionado',
    editUser: 'Editar Usuario',
    createUser: 'Nuevo Usuario',
    email: 'Correo electrónico',
    username: 'Usuario / Alias',
    fullName: 'Nombre Completo',
    visibleName: 'Nombre visible',
    password: 'Contraseña',
    cancel: 'Cancelar',
    saving: 'Guardando...',
    update: 'Actualizar',
    create: 'Crear Usuario',
    seller: 'Vendedor',
    admin: 'Administrador',
    ownerBusiness: 'Owner Negocio',
    superAdminPlatform: 'Super Admin Plataforma',
    owner: 'Owner',
    superAdmin: 'Super Admin',
    noBusinessAssigned: 'Sin negocio asignado',
    yourAccount: 'Tu cuenta',
    protectedAccount: 'Cuenta protegida',
    protectedOwner: 'Owner protegido',
    noPermission: 'Sin permiso',
    userCreated: 'Usuario creado exitosamente',
    userUpdated: 'Usuario actualizado exitosamente',
    userDeleted: 'Usuario eliminado exitosamente',
    loadError: 'Error al cargar usuarios',
    saveError: 'Error al guardar usuario',
    emailAlreadyExists: 'Ya existe un usuario registrado con ese correo electrónico. Utiliza otro correo.',
    usernameAlreadyExists: 'Ya existe un usuario con ese alias. Utiliza otro nombre de usuario.',
    authSyncError: 'No se pudo sincronizar el usuario con Authentication.',
    authDeleteError: 'No se pudo eliminar el usuario de Authentication.',
    deleteError: 'Error al eliminar usuario',
    userNotFound: 'Usuario no encontrado',
    cannotEditSelf: 'No puedes modificar tu propia cuenta desde este panel',
    cannotEditSuperAdmin: 'No puedes modificar un usuario super admin',
    cannotEditOwner: 'No puedes modificar un owner desde este panel',
    cannotCreateSuperAdmins: 'No puedes crear super admins desde este panel',
    businessAdminCreateLimit: 'Un administrador de negocio solo puede crear vendedores y administradores',
    businessAdminMissingBusiness: 'No se encontró el negocio del administrador',
    emailRequired: 'El correo electrónico es obligatorio',
    usernameRequired: 'El usuario/alias es obligatorio',
    fullNameRequired: 'El nombre completo es obligatorio',
    passwordMin: 'La contraseña debe tener mínimo 6 caracteres',
    cannotEditOtherBusiness: 'No puedes modificar usuarios de otro negocio',
    businessAdminRoleLimit: 'Un administrador de negocio solo puede asignar roles vendedor o administrador',
    cannotDeleteSelf: 'No puedes eliminar tu propia cuenta',
    cannotDeleteOwner: 'No puedes eliminar usuarios owner desde este panel',
    adminDeleteLimit: 'Un administrador solo puede eliminar vendedores',
    cannotDeleteUser: 'No tienes permiso para eliminar este usuario',
    cannotDeleteOtherBusiness: 'No puedes eliminar usuarios de otro negocio',
    deleteTitle: 'Eliminar Usuario',
    deleteMessageStart: '¿Estás seguro de que deseas eliminar al usuario',
    deleteMessageEnd: 'Esta acción no se puede deshacer.',
    confirmDelete: 'Sí, Eliminar',
    emailPlaceholder: 'usuario@negocio.com',
    usernamePlaceholder: 'usuario123',
    fullNamePlaceholder: 'Juan Pérez',
    visibleNamePlaceholder: 'Ej. Mac Arthur Jean Pierre',
    usernameEditPlaceholder: 'Ej. macarthur',
  },
  en: {
    title: 'Users',
    subtitle: 'Manage platform users, roles, and access',
    restrictedTitle: 'Restricted access',
    restrictedSellerText: 'Sellers do not have access to the users module.',
    newUser: 'New User',
    loadingUsers: 'Loading users...',
    noUsers: 'No users registered',
    searchPlaceholder: 'Search by name, email, username, business, or role...',
    totalUsers: 'Total users',
    admins: 'Administrators',
    sellers: 'Sellers',
    protectedUsers: 'Protected',
    page: 'Page',
    previous: 'Previous',
    next: 'Next',
    of: 'of',
    user: 'User',
    business: 'Business',
    role: 'Role',
    created: 'Created',
    actions: 'Actions',
    edit: 'Edit',
    delete: 'Delete',
    selectedUser: 'Selected user',
    editUser: 'Edit User',
    createUser: 'New User',
    email: 'Email',
    username: 'Username / Alias',
    fullName: 'Full Name',
    visibleName: 'Display name',
    password: 'Password',
    cancel: 'Cancel',
    saving: 'Saving...',
    update: 'Update',
    create: 'Create User',
    seller: 'Seller',
    admin: 'Administrator',
    ownerBusiness: 'Business Owner',
    superAdminPlatform: 'Platform Super Admin',
    owner: 'Owner',
    superAdmin: 'Super Admin',
    noBusinessAssigned: 'No assigned business',
    yourAccount: 'Your account',
    protectedAccount: 'Protected account',
    protectedOwner: 'Protected owner',
    noPermission: 'No permission',
    userCreated: 'User created successfully',
    userUpdated: 'User updated successfully',
    userDeleted: 'User deleted successfully',
    loadError: 'Error loading users',
    saveError: 'Error saving user',
    emailAlreadyExists: 'A user is already registered with this email address. Use another email.',
    usernameAlreadyExists: 'A user with this username already exists. Use another username.',
    authSyncError: 'Could not synchronize the user with Authentication.',
    authDeleteError: 'Could not delete the user from Authentication.',
    deleteError: 'Error deleting user',
    userNotFound: 'User not found',
    cannotEditSelf: 'You cannot modify your own account from this panel',
    cannotEditSuperAdmin: 'You cannot modify a super admin user',
    cannotEditOwner: 'You cannot modify an owner from this panel',
    cannotCreateSuperAdmins: 'You cannot create super admins from this panel',
    businessAdminCreateLimit: 'A business administrator can only create sellers and administrators',
    businessAdminMissingBusiness: 'The administrator business was not found',
    emailRequired: 'Email is required',
    usernameRequired: 'Username/alias is required',
    fullNameRequired: 'Full name is required',
    passwordMin: 'Password must be at least 6 characters',
    cannotEditOtherBusiness: 'You cannot modify users from another business',
    businessAdminRoleLimit: 'A business administrator can only assign seller or administrator roles',
    cannotDeleteSelf: 'You cannot delete your own account',
    cannotDeleteOwner: 'You cannot delete owner users from this panel',
    adminDeleteLimit: 'An administrator can only delete sellers',
    cannotDeleteUser: 'You do not have permission to delete this user',
    cannotDeleteOtherBusiness: 'You cannot delete users from another business',
    deleteTitle: 'Delete User',
    deleteMessageStart: 'Are you sure you want to delete user',
    deleteMessageEnd: 'This action cannot be undone.',
    confirmDelete: 'Yes, Delete',
    emailPlaceholder: 'user@business.com',
    usernamePlaceholder: 'user123',
    fullNamePlaceholder: 'John Smith',
    visibleNamePlaceholder: 'Ex. Mac Arthur Jean Pierre',
    usernameEditPlaceholder: 'Ex. macarthur',
  },
} as const;

type Usuario = {
  id: string;
  negocio_id: string | null;
  rol: UserRole | string | null;
  created_at: string | null;
  email?: string | null;
  username?: string | null;
  full_name?: string | null;
  is_active?: boolean | null;
  negocios?: {
    nombre: string;
  } | null;
};

export function UsersPage() {
  const { showToast, showConfirm } = useNotification();
  const { user, userProfile } = useAuth();
  const { language } = useLanguage();
  const t = usersCopy[language];
  const roleFlags = getUserRoleFlags(userProfile);
  const normalizedCurrentRole = roleFlags.role;
  const isSuperAdmin = roleFlags.isSuperAdmin;
  const isOwner = roleFlags.isOwner;
  const isAdmin = roleFlags.isAdmin;
  const isSeller = roleFlags.isSeller;
  const canManageBusinessUsers = roleFlags.canManageUsers && !isSuperAdmin;
  const assignableRoles: UserRole[] = isSuperAdmin
    ? ['seller', 'admin', 'owner']
    : isOwner
      ? ['seller', 'admin']
      : ['seller'];
  const canAccessUsersPage = isSuperAdmin || isOwner || isAdmin;
  const profileData = userProfile as Record<string, unknown> | null | undefined;
  const loggedUserName = String(
    profileData?.full_name ||
    profileData?.nombre ||
    profileData?.username ||
    user?.email ||
    'Usuario'
  );
  const loggedUserEmail = String(profileData?.email || user?.email || '');
  const loggedUserRole = roleFlags.role;
  const auditNegocioId = userProfile?.negocio_id || null;
  const [users, setUsers] = useState<Usuario[]>([]);
  const [businessNames, setBusinessNames] = useState<Record<string, string>>({});
  const currentUserId = user?.id || null;
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUserModalVisible, setIsUserModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<Usuario | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [openBusinessIds, setOpenBusinessIds] = useState<Record<string, boolean>>({});

  const [formData, setFormData] = useState({
    email: '',
    username: '',
    full_name: '',
    password: '',
    role: 'seller' as UserRole,
    is_active: true
  });

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('usuarios')
        .select('id, negocio_id, rol, created_at, email, username, full_name, is_active, negocios(nombre)')
        .order('created_at', { ascending: false });

      if (!isSuperAdmin) {
        if (!userProfile?.negocio_id) {
          setUsers([]);
          return;
        }

        query = query.eq('negocio_id', userProfile.negocio_id);
      }

      const { data, error } = await query;
      if (error) throw error;

      const loadedUsers = (data || []) as unknown as Usuario[];
      const negocioIds = Array.from(
        new Set(
          loadedUsers
            .map((item) => item.negocio_id)
            .filter((id): id is string => Boolean(id))
        )
      );

      if (negocioIds.length > 0) {
        const { data: negociosData, error: negociosError } = await supabase
          .from('negocios')
          .select('id, nombre')
          .in('id', negocioIds);

        if (negociosError) {
          console.warn('No se pudieron cargar nombres de negocios:', negociosError);
        } else {
          setBusinessNames(
            (negociosData || []).reduce<Record<string, string>>((acc, negocio) => {
              if (negocio.id && negocio.nombre) {
                acc[String(negocio.id)] = String(negocio.nombre);
              }

              return acc;
            }, {})
          );
        }
      } else {
        setBusinessNames({});
      }

      setUsers(loadedUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      showToast(t.loadError, 'error');
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin, showToast, t.loadError, userProfile?.negocio_id]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers, normalizedCurrentRole]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const normalizeUserRole = useCallback((role: UserRole | string | null | undefined) => {
    const value = String(role || 'seller').toLowerCase().trim();

    if (value === 'superadmin' || value === 'super_admin') return 'super_admin';
    if (value === 'owner' || value === 'dueño' || value === 'dueno') return 'owner';
    if (value === 'admin' || value === 'administrador') return 'admin';
    if (value === 'seller' || value === 'vendedor') return 'seller';

    return value as UserRole;
  }, []);

  const getUserRole = useCallback((user: Usuario | null | undefined) => {
    return normalizeUserRole(user?.rol);
  }, [normalizeUserRole]);

  const getBusinessDisplayName = useCallback((user: Usuario) => {
    if (!user.negocio_id) return t.noBusinessAssigned;
    return user.negocios?.nombre || businessNames[user.negocio_id] || t.noBusinessAssigned;
  }, [businessNames, t.noBusinessAssigned]);

  const getUserDisplayName = useCallback((user: Usuario) => {
    return user.full_name || user.username || user.email || getBusinessDisplayName(user);
  }, [getBusinessDisplayName]);

  const getRoleOrder = useCallback((user: Usuario) => {
    const role = getUserRole(user);

    if (role === 'super_admin') return 0;
    if (role === 'owner') return 1;
    if (role === 'admin') return 2;
    if (role === 'seller') return 3;

    return 4;
  }, [getUserRole]);

  const isProtectedUser = useCallback((user: Usuario) => {
    const role = getUserRole(user);

    if (user.id === currentUserId) {
      return true;
    }

    if (role === 'super_admin') {
      return true;
    }

    if (role === 'owner' && !isSuperAdmin) {
      return true;
    }

    return false;
  }, [currentUserId, getUserRole, isSuperAdmin]);

  function canDeleteUser(user: Usuario) {
    const role = getUserRole(user);

    if (user.id === currentUserId) {
      return false;
    }

    if (isSuperAdmin) {
      return role !== 'super_admin';
    }

    if (isOwner) {
      return user.negocio_id === userProfile?.negocio_id && role !== 'owner' && role !== 'super_admin';
    }

    if (isAdmin) {
      return user.negocio_id === userProfile?.negocio_id && role === 'seller';
    }

    return false;
  }

  function getProtectedLabel(user: Usuario) {
    const role = getUserRole(user);

    if (user.id === currentUserId) {
      return t.yourAccount;
    }

    if (role === 'super_admin') {
      return t.protectedAccount;
    }

    if (role === 'owner') {
      return t.protectedOwner;
    }

    return t.noPermission;
  }

  const filteredUsers = useMemo(() => {
    const search = searchTerm.toLowerCase().trim();

    return users.filter((item) => {
      const role = getUserRole(item);
      const businessName = getBusinessDisplayName(item);

      return (
        getUserDisplayName(item).toLowerCase().includes(search) ||
        (item.email || '').toLowerCase().includes(search) ||
        (item.username || '').toLowerCase().includes(search) ||
        businessName.toLowerCase().includes(search) ||
        String(role || '').toLowerCase().includes(search)
      );
    });
  }, [users, searchTerm, getBusinessDisplayName, getUserDisplayName, getUserRole]);

  const userMetrics = useMemo(() => {
    const admins = users.filter((item) => getUserRole(item) === 'admin').length;
    const sellers = users.filter((item) => getUserRole(item) === 'seller').length;
    const protectedUsers = users.filter((item) => isProtectedUser(item)).length;

    return {
      totalUsers: users.length,
      admins,
      sellers,
      protectedUsers
    };
  }, [users, getUserRole, isProtectedUser]);

  const groupedUsersByBusiness = useMemo(() => {
    const groups = filteredUsers.reduce<Record<string, { businessName: string; users: Usuario[] }>>((acc, item) => {
      const key = item.negocio_id || 'sin-negocio';
      const businessName = getBusinessDisplayName(item);

      if (!acc[key]) {
        acc[key] = { businessName, users: [] };
      }

      acc[key].users.push(item);
      return acc;
    }, {});

    return Object.entries(groups)
      .map(([businessId, group]) => ({
        businessId,
        businessName: group.businessName,
        users: [...group.users].sort((a, b) => {
          const roleDiff = getRoleOrder(a) - getRoleOrder(b);

          if (roleDiff !== 0) return roleDiff;

          return getUserDisplayName(a).localeCompare(getUserDisplayName(b));
        }),
        owners: group.users.filter((item) => getUserRole(item) === 'owner').length,
        admins: group.users.filter((item) => getUserRole(item) === 'admin').length,
        sellers: group.users.filter((item) => getUserRole(item) === 'seller').length,
        protectedCount: group.users.filter((item) => isProtectedUser(item)).length
      }))
      .sort((a, b) => {
        const aHasSuperAdmin = a.users.some((u) => getUserRole(u) === 'super_admin');
        const bHasSuperAdmin = b.users.some((u) => getUserRole(u) === 'super_admin');

        if (aHasSuperAdmin && !bHasSuperAdmin) return -1;
        if (!aHasSuperAdmin && bHasSuperAdmin) return 1;

        return a.businessName.localeCompare(b.businessName);
      });
  }, [filteredUsers, getBusinessDisplayName, getRoleOrder, getUserDisplayName, getUserRole, isProtectedUser]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / USERS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * USERS_PER_PAGE;
  const pageEndIndex = Math.min(pageStartIndex + USERS_PER_PAGE, filteredUsers.length);

  const visibleUsers = useMemo(() => {
    return filteredUsers.slice(pageStartIndex, pageEndIndex);
  }, [filteredUsers, pageStartIndex, pageEndIndex]);

  function openCreateModal() {
    setEditingUser(null);
    setFormData({
      email: '',
      username: '',
      full_name: '',
      password: '',
      role: 'seller',
      is_active: true
    });
    setShowPassword(false);
    setIsUserModalVisible(false);
    setIsModalOpen(true);

    window.requestAnimationFrame(() => {
      setIsUserModalVisible(true);
    });
  }

  function openEditModal(user: Usuario) {
    const role = getUserRole(user);

    if (user.id === currentUserId) {
      showToast(t.cannotEditSelf, 'error');
      return;
    }

    if (getUserRole(user) === 'super_admin' && !isSuperAdmin) {
      showToast(t.cannotEditSuperAdmin, 'error');
      return;
    }

    if (getUserRole(user) === 'owner' && !isSuperAdmin) {
      showToast(t.cannotEditOwner, 'error');
      return;
    }

    setEditingUser(user);
    setFormData({
      email: user.email || '',
      username: user.username || '',
      full_name: user.full_name || '',
      password: '',
      role,
      is_active: user.is_active ?? true
    });
    setShowPassword(false);
    setIsUserModalVisible(false);
    setIsModalOpen(true);

    window.requestAnimationFrame(() => {
      setIsUserModalVisible(true);
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingUser) {
        await updateUser(editingUser.id);
      } else {
        await createUser();
      }
    } catch (error) {
      console.error('Error:', error);
      const message = error instanceof Error ? error.message : t.saveError;
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function getFunctionErrorMessage(error: unknown) {
    const fallbackMessage = error instanceof Error ? error.message : t.saveError;
    const maybeContext = (error as { context?: unknown })?.context;
    const normalizeErrorValue = (value: unknown): string => {
      if (!value) return '';
      if (typeof value === 'string') return value;
      if (value instanceof Error) return value.message;

      if (typeof value === 'object') {
        const objectValue = value as Record<string, unknown>;
        const nestedMessage =
          objectValue.message ||
          objectValue.error_description ||
          objectValue.error ||
          objectValue.msg ||
          objectValue.details;

        if (nestedMessage && nestedMessage !== value) {
          return normalizeErrorValue(nestedMessage);
        }

        try {
          return JSON.stringify(value);
        } catch {
          return fallbackMessage;
        }
      }

      return String(value);
    };

    if (maybeContext && typeof (maybeContext as Response).json === 'function') {
      try {
        const body = await (maybeContext as Response).json();
        const parsedError = normalizeErrorValue(
          (body as { error?: unknown; message?: unknown })?.error ||
          (body as { message?: unknown })?.message ||
          body
        );

        if (parsedError) {
          return parsedError;
        }
      } catch (parseError) {
        console.error('Error parsing function error response:', parseError);
      }
    }

    return fallbackMessage;
  }

  function getFriendlyCreateUserError(errorMessage: string) {
    const lowerMessage = errorMessage.toLowerCase();

    if (
      lowerMessage.includes('ya existe un usuario con ese correo') ||
      lowerMessage.includes('already registered') ||
      lowerMessage.includes('already exists') ||
      lowerMessage.includes('email') && lowerMessage.includes('exists')
    ) {
      return `${t.emailAlreadyExists}\n${formData.email.trim()}`;
    }

    if (
      lowerMessage.includes('username') ||
      lowerMessage.includes('usuario/alias') ||
      lowerMessage.includes('alias')
    ) {
      return `${t.usernameAlreadyExists}\n${formData.username.trim()}`;
    }

    return errorMessage || t.saveError;
  }

  async function createUser() {
    if (!canAccessUsersPage) {
      throw new Error(t.noPermission);
    }

    if (formData.role === 'super_admin') {
      throw new Error(t.cannotCreateSuperAdmins);
    }

    if (!assignableRoles.includes(formData.role)) {
      throw new Error(t.businessAdminCreateLimit);
    }

    if (canManageBusinessUsers && !userProfile?.negocio_id) {
      throw new Error(t.businessAdminMissingBusiness);
    }

    if (!formData.email.trim()) {
      throw new Error(t.emailRequired);
    }

    if (!formData.username.trim()) {
      throw new Error(t.usernameRequired);
    }

    if (!formData.full_name.trim()) {
      throw new Error(t.fullNameRequired);
    }

    if (!formData.password || formData.password.length < 6) {
      throw new Error(t.passwordMin);
    }

    const { data, error } = await supabase.functions.invoke('create-user', {
      body: {
        email: formData.email.trim(),
        username: formData.username.trim(),
        full_name: formData.full_name.trim(),
        password: formData.password,
        role: formData.role,
        negocio_id: isSuperAdmin ? null : userProfile?.negocio_id,
        is_active: formData.is_active
      }
    });

    if (error) {
      const functionErrorMessage = await getFunctionErrorMessage(error);
      throw new Error(getFriendlyCreateUserError(functionErrorMessage));
    }

    if (data?.error) {
      throw new Error(getFriendlyCreateUserError(data.error));
    }

    const createdUserId = data?.user_id || data?.id || formData.email.trim();
    const createdUserNegocioId = data?.negocio_id || (isSuperAdmin ? null : userProfile?.negocio_id || null);

    if (user?.id && (auditNegocioId || createdUserNegocioId)) {
      await logAudit({
        negocio_id: auditNegocioId || createdUserNegocioId || '',
        user_id: user.id,
        user_name: loggedUserName,
        user_email: loggedUserEmail || undefined,
        user_role: loggedUserRole || undefined,
        action: 'CREATE_USER',
        module: 'USERS',
        record_id: createdUserId,
        description: `Usuario ${formData.full_name.trim()} creado por ${loggedUserName}`,
        new_data: {
          created_user_id: createdUserId,
          email: formData.email.trim(),
          username: formData.username.trim(),
          full_name: formData.full_name.trim(),
          role: formData.role,
          negocio_id: createdUserNegocioId,
          is_active: formData.is_active
        }
      });
    }

    showToast(t.userCreated, 'success');
    closeUserModal();
    await loadUsers();
  }

  async function updateUser(userId: string) {
    const existingUser = users.find((u) => u.id === userId);

    if (!existingUser) {
      throw new Error(t.userNotFound);
    }

    if (existingUser.id === currentUserId) {
      throw new Error(t.cannotEditSelf);
    }

    if (getUserRole(existingUser) === 'super_admin' && !isSuperAdmin) {
      throw new Error(t.cannotEditSuperAdmin);
    }

    if (getUserRole(existingUser) === 'owner' && !isSuperAdmin) {
      throw new Error(t.cannotEditOwner);
    }

    if (canManageBusinessUsers) {
      if (existingUser?.negocio_id !== userProfile?.negocio_id) {
        throw new Error(t.cannotEditOtherBusiness);
      }

      if (!assignableRoles.includes(formData.role)) {
        throw new Error(t.businessAdminRoleLimit);
      }
    }

    const normalizedEmail = formData.email.trim().toLowerCase();

    const { data: authSyncData, error: authSyncError } = await supabase.functions.invoke('update-user', {
      body: {
        userId,
        email: normalizedEmail,
        full_name: formData.full_name.trim() || null,
        username: formData.username.trim() || null,
        role: formData.role,
        is_active: formData.is_active
      }
    });

    if (authSyncError) {
      const functionErrorMessage = await getFunctionErrorMessage(authSyncError);
      throw new Error(functionErrorMessage || t.authSyncError);
    }

    if (authSyncData?.error) {
      throw new Error(authSyncData.error || t.authSyncError);
    }

    // update-user already wrote the usuarios row via service role above —
    // just read it back, don't write it again from the client.
    let selectQuery = supabase
      .from('usuarios')
      .select('id, negocio_id, rol, created_at, email, username, full_name, is_active, negocios(nombre)')
      .eq('id', userId);

    if (!isSuperAdmin) {
      selectQuery = selectQuery.eq('negocio_id', userProfile?.negocio_id || '');
    }

    const { data: updatedRows, error } = await selectQuery;

    if (error) {
      console.error('Update user error:', error);
      throw error;
    }

    if (!updatedRows || updatedRows.length === 0) {
      throw new Error('No se actualizó ningún usuario. Revisa las políticas RLS UPDATE/SELECT de la tabla usuarios.');
    }

    const updatedDbUser = updatedRows[0] as unknown as Usuario;

    if (user?.id && existingUser && (existingUser.negocio_id || auditNegocioId)) {
      await logAudit({
        negocio_id: existingUser.negocio_id || auditNegocioId || '',
        user_id: user.id,
        user_name: loggedUserName,
        user_email: loggedUserEmail || undefined,
        user_role: loggedUserRole || undefined,
        action: existingUser.rol !== formData.role ? 'CHANGE_ROLE' : 'UPDATE_USER',
        module: 'USERS',
        record_id: userId,
        description: `Usuario ${getUserDisplayName(existingUser)} actualizado por ${loggedUserName}`,
        old_data: {
          id: existingUser.id,
          negocio_id: existingUser.negocio_id,
          rol: existingUser.rol,
          email: existingUser.email,
          username: existingUser.username,
          full_name: existingUser.full_name,
          is_active: existingUser.is_active
        },
        new_data: {
          id: userId,
          rol: formData.role,
          email: normalizedEmail || null,
          username: formData.username.trim() || null,
          full_name: formData.full_name.trim() || null,
          is_active: formData.is_active
        }
      });
    }

    setUsers((prev) =>
      prev.map((item) =>
        item.id === userId
          ? {
              ...item,
              ...updatedDbUser,
              negocios: updatedDbUser.negocios || item.negocios
            }
          : item
      )
    );

    showToast(t.userUpdated, 'success');
    closeUserModal();
    await loadUsers();
  }

  async function handleDelete(userId: string, username: string) {
    const protectedUser = users.find((u) => u.id === userId);

    if (!protectedUser) {
      showToast(t.userNotFound, 'error');
      return;
    }

    if (!canDeleteUser(protectedUser)) {
      if (protectedUser.id === currentUserId) {
        showToast(t.cannotDeleteSelf, 'error');
        return;
      }

      if (getUserRole(protectedUser) === 'owner') {
        showToast(t.cannotDeleteOwner, 'error');
        return;
      }

      if (isAdmin) {
        showToast(t.adminDeleteLimit, 'error');
        return;
      }

      showToast(t.cannotDeleteUser, 'error');
      return;
    }

    if (canManageBusinessUsers && protectedUser?.negocio_id !== userProfile?.negocio_id) {
      showToast(t.cannotDeleteOtherBusiness, 'error');
      return;
    }

    const confirmed = await showConfirm({
      title: t.deleteTitle,
      message: `${t.deleteMessageStart} "${username}"? ${t.deleteMessageEnd}`,
      confirmText: t.confirmDelete,
      cancelText: t.cancel,
      variant: 'danger'
    });

    if (!confirmed) return;

    try {
      setLoading(true);

      const { data: deleteData, error: deleteError } = await supabase.functions.invoke('delete-user', {
        body: { userId }
      });

      if (deleteError) {
        const functionErrorMessage = await getFunctionErrorMessage(deleteError);
        throw new Error(functionErrorMessage || t.authDeleteError);
      }

      if (deleteData?.error) {
        throw new Error(deleteData.error || t.authDeleteError);
      }

      if (user?.id && (protectedUser.negocio_id || auditNegocioId)) {
        await logAudit({
          negocio_id: protectedUser.negocio_id || auditNegocioId || '',
          user_id: user.id,
          user_name: loggedUserName,
          user_email: loggedUserEmail || undefined,
          user_role: loggedUserRole || undefined,
          action: 'DELETE_USER',
          module: 'USERS',
          record_id: userId,
          description: `Usuario ${username} eliminado por ${loggedUserName}`,
          old_data: {
            id: protectedUser.id,
            negocio_id: protectedUser.negocio_id,
            rol: protectedUser.rol,
            email: protectedUser.email,
            username: protectedUser.username,
            full_name: protectedUser.full_name,
            is_active: protectedUser.is_active
          }
        });
      }

      showToast(t.userDeleted, 'success');
      await loadUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      showToast(
        error instanceof Error ? error.message : t.deleteError,
        'error'
      );
    } finally {
      setLoading(false);
    }
  }

  function renderRoleBadge(role: UserRole | string | null) {
    const normalizedRole = normalizeUserRole(role);

    if (normalizedRole === 'super_admin') {
      return (
        <span className="inline-flex h-9 min-w-[118px] items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#050505] px-3 text-sm font-black leading-none text-[#f4c542]">
          <Crown size={16} className="shrink-0 text-[#f4c542]" />
          {t.superAdmin}
        </span>
      );
    }

    if (normalizedRole === 'owner' || normalizedRole === 'admin') {
      return (
        <span className="inline-flex h-9 min-w-[118px] items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#fff4c7] px-3 text-sm font-black leading-none text-[#8a6a16]">
          <Shield size={16} className="shrink-0 text-[#8a6a16]" />
          {normalizedRole === 'owner' ? t.owner : t.admin}
        </span>
      );
    }

    return (
      <span className="inline-flex h-9 min-w-[118px] items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-blue-100 px-3 text-sm font-black leading-none text-blue-700">
        <ShoppingBag size={16} className="shrink-0 text-blue-600" />
        {t.seller}
      </span>
    );
  }

  if (isSeller || !canAccessUsersPage) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center overflow-x-hidden bg-[#fbfaf7] p-4 sm:p-6">
        <div className="w-full max-w-xl rounded-[2rem] border border-[#e9e2d3] bg-white/90 p-5 text-center shadow-matmax-soft sm:p-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#050505] text-[#f4c542]">
            <Shield size={26} />
          </div>
          <h1 className="mb-3 text-xl font-serif font-bold text-[#050505] sm:text-2xl">
            {t.restrictedTitle}
          </h1>
          <p className="text-sm text-[#71717a] sm:text-base">
            {t.restrictedSellerText}
          </p>
        </div>
      </div>
    );
  }

  function closeUserModal() {
    setIsUserModalVisible(false);

    window.setTimeout(() => {
      setIsModalOpen(false);
      setEditingUser(null);
      setShowPassword(false);
      setFormData({
        email: '',
        username: '',
        full_name: '',
        password: '',
        role: 'seller',
        is_active: true
      });
    }, 220);
  }

  return (
    <div className="w-full min-w-0 space-y-5 overflow-x-hidden text-[#08080b] sm:space-y-8">
      <section className="relative min-w-0 overflow-hidden rounded-[2rem] border border-[#e9e2d3]/80 bg-[#fffdf8]/85 p-5 shadow-[0_24px_70px_rgba(15,15,15,0.07)] backdrop-blur-2xl sm:p-7 xl:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(244,197,66,0.16),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.88),transparent_42%)]" />
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#f4c542]/60 to-transparent" />
        <div className="relative z-10 flex min-w-0 flex-col justify-between gap-6 xl:flex-row xl:items-center">
          <div className="min-w-0">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#eadfca] bg-white/75 px-3.5 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-[#8a6a16] shadow-sm backdrop-blur-xl">
              <Users size={14} />
              MatMax Business Suite
            </div>
            <h1 className="mb-3 text-4xl font-black tracking-tight text-[#050505] sm:text-5xl xl:text-[4rem]">
              {t.title}
            </h1>
            <p className="max-w-3xl text-sm font-bold uppercase tracking-[0.18em] text-[#71717a] sm:text-base">
              {t.subtitle}
            </p>
          </div>

          <Button type="button" className="w-full rounded-2xl px-5 py-3 shadow-[0_18px_45px_rgba(0,0,0,0.18)] sm:w-auto" onClick={openCreateModal}>
            <UserPlus className="shrink-0" size={20} />
            {t.newUser}
          </Button>
        </div>
      </section>

      <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <UserMetricCard title={t.totalUsers} value={userMetrics.totalUsers.toLocaleString('en-US')} icon={Users} iconClass="bg-[#050505] text-[#f4c542]" />
        <UserMetricCard title={t.admins} value={userMetrics.admins.toLocaleString('en-US')} icon={Shield} iconClass="bg-[#fff4c7] text-[#8a6a16]" />
        <UserMetricCard title={t.sellers} value={userMetrics.sellers.toLocaleString('en-US')} icon={ShoppingBag} iconClass="bg-blue-50 text-blue-700" />
        <UserMetricCard title={t.protectedUsers} value={userMetrics.protectedUsers.toLocaleString('en-US')} icon={Crown} iconClass="bg-[#f6f4ee] text-[#050505]" />
      </div>

      <div className="rounded-[1.6rem] border border-[#e9e2d3] bg-white/92 p-4 shadow-[0_18px_50px_rgba(15,15,15,0.06)] backdrop-blur-xl sm:rounded-[2rem] sm:p-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 shrink-0 -translate-y-1/2 transform text-[#a1a1aa]" size={20} />
          <Input
            type="text"
            placeholder={t.searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Card className="overflow-hidden border-[#e9e2d3] bg-white/92 shadow-[0_22px_65px_rgba(15,15,15,0.06)] backdrop-blur-2xl">
        <CardContent>
          {loading && users.length === 0 ? (
            <div className="py-12 text-center font-semibold text-[#71717a]">
              {t.loadingUsers}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="rounded-2xl border border-[#f1ebdf] bg-[#fbfaf7] py-12 text-center font-semibold text-[#71717a]">
              <AlertCircle className="mx-auto mb-4 shrink-0 text-[#a1a1aa]" size={48} />
              {t.noUsers}
            </div>
          ) : isSuperAdmin ? (
            <>
              <div className="space-y-3">
                {groupedUsersByBusiness.map((group) => {
                  const isOpen = openBusinessIds[group.businessId] ?? true;

                  return (
                    <div key={group.businessId} className="overflow-hidden rounded-[1.5rem] border border-[#e9e2d3] bg-white shadow-[0_14px_34px_rgba(15,15,15,0.05)]">
                      <button
                        type="button"
                        onClick={() => setOpenBusinessIds((current) => ({ ...current, [group.businessId]: !isOpen }))}
                        className="flex w-full min-w-0 items-center justify-between gap-4 bg-[#fbfaf7] px-4 py-4 text-left transition hover:bg-[#fff9e8]"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#050505] text-[#f4c542] shadow-[0_14px_30px_rgba(0,0,0,0.16)]">
                            <Building2 size={20} />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-lg font-black text-[#050505]">{group.businessName}</p>
                            <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-[#8a6a16]">
                              {group.users.length.toLocaleString('en-US')} {t.user} · {group.owners.toLocaleString('en-US')} {t.owner} · {group.admins.toLocaleString('en-US')} {t.admin} · {group.sellers.toLocaleString('en-US')} {t.seller}
                            </p>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          {group.protectedCount > 0 && (
                            <span className="hidden rounded-full border border-[#f4c542]/30 bg-[#fff4c7] px-3 py-1 text-xs font-black text-[#8a6a16] sm:inline-flex">
                              {group.protectedCount.toLocaleString('en-US')} {t.protectedUsers}
                            </span>
                          )}
                          <ChevronDown className={`text-[#8a6a16] transition-transform ${isOpen ? 'rotate-180' : ''}`} size={22} />
                        </div>
                      </button>

                      {isOpen && (
                        <div className="divide-y divide-[#f1ebdf]">
                          {group.users.map((item) => (
                            <div key={item.id} className="grid min-w-0 grid-cols-1 gap-3 px-4 py-4 transition hover:bg-[#fffdf8] lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.75fr)_auto] lg:items-center">
                              <div className="min-w-0">
                                <p className="break-words font-black text-[#050505]">{getUserDisplayName(item)}</p>
                                {item.email && <p className="mt-1 break-words text-sm font-semibold text-[#71717a]">{formatEmail(item.email)}</p>}
                                <p className="mt-1 text-xs font-semibold text-[#a1a1aa]">
                                  {item.username || formatEmail(item.email, '') || getBusinessDisplayName(item)}
                                </p>
                              </div>

                              <div className="flex min-w-0 items-center">
                                {renderRoleBadge(item.rol)}
                              </div>

                              <div className="flex flex-wrap items-center justify-end gap-2">
                                {!canDeleteUser(item) && isProtectedUser(item) ? (
                                  <div className="rounded-xl border border-[#f4c542]/30 bg-[#fff4c7] px-3 py-2 text-xs font-black text-[#8a6a16]">
                                    {getProtectedLabel(item)}
                                  </div>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => openEditModal(item)}
                                      className="rounded-xl border border-blue-100 bg-blue-50 p-2 text-blue-600 transition-all hover:-translate-y-0.5 hover:bg-blue-100"
                                      title={t.edit}
                                      type="button"
                                    >
                                      <Edit2 className="shrink-0" size={18} />
                                    </button>

                                    {canDeleteUser(item) && (
                                      <button
                                        onClick={() => handleDelete(item.id, getUserDisplayName(item))}
                                        className="rounded-xl border border-red-100 bg-red-50 p-2 text-red-600 transition-all hover:-translate-y-0.5 hover:bg-red-100"
                                        title={t.delete}
                                        type="button"
                                      >
                                        <Trash2 className="shrink-0" size={18} />
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <div className="hidden rounded-2xl border border-[#f1ebdf] bg-[#fffdf8] lg:block">
                <table className="w-full table-fixed">
                  <thead className="border-b border-[#e9e2d3] bg-[#fbfaf7]">
                    <tr>
                      <th className="w-[30%] px-4 py-3 text-left text-xs font-black uppercase tracking-[0.16em] text-[#8a6a16]">{t.user}</th>
                      <th className="w-[26%] px-4 py-3 text-left text-xs font-black uppercase tracking-[0.16em] text-[#8a6a16]">{t.business}</th>
                      <th className="w-[16%] px-4 py-3 text-left text-xs font-black uppercase tracking-[0.16em] text-[#8a6a16]">{t.role}</th>
                      <th className="w-[11%] px-4 py-3 text-left text-xs font-black uppercase tracking-[0.16em] text-[#8a6a16]">{t.created}</th>
                      <th className="w-[17%] px-4 py-3 text-right text-xs font-black uppercase tracking-[0.16em] text-[#8a6a16]">{t.actions}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f1ebdf]">
                    {visibleUsers.map((item) => (
                      <tr key={item.id} className="transition-all duration-300 hover:bg-[#fff9e8]">
                        <td className="px-4 py-3">
                          <p className="line-clamp-2 break-words font-black leading-snug text-[#050505]">{getUserDisplayName(item)}</p>
                          {item.email && (
                            <p className="mt-1 truncate text-sm font-semibold text-[#71717a]">{formatEmail(item.email)}</p>
                          )}
                          <p className="mt-1 truncate text-xs font-semibold text-[#a1a1aa]">
                            {item.username || formatEmail(item.email, '') || getBusinessDisplayName(item)}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="line-clamp-2 break-words font-black leading-snug text-[#050505]">{getBusinessDisplayName(item)}</p>
                          {item.negocio_id && (
                            <p className="mt-1 truncate text-xs font-semibold text-[#a1a1aa]">
                              {item.negocios?.nombre || t.noBusinessAssigned}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex min-w-0 items-center justify-start">
                            {renderRoleBadge(item.rol)}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-[#71717a]">
                          {formatArgentinaDate(item.created_at || '')}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            {!canDeleteUser(item) && isProtectedUser(item) ? (
                              <div className="max-w-full whitespace-normal rounded-xl border border-[#f4c542]/30 bg-[#fff4c7] px-3 py-2 text-center text-xs font-black leading-tight text-[#8a6a16]">
                                {getProtectedLabel(item)}
                              </div>
                            ) : (
                              <>
                                <button
                                  onClick={() => openEditModal(item)}
                                  className="rounded-xl border border-blue-100 bg-blue-50 p-2 text-blue-600 transition-all hover:-translate-y-0.5 hover:bg-blue-100"
                                  title={t.edit}
                                  type="button"
                                >
                                  <Edit2 className="shrink-0" size={18} />
                                </button>

                                {canDeleteUser(item) && (
                                  <button
                                    onClick={() => handleDelete(item.id, getUserDisplayName(item))}
                                    className="rounded-xl border border-red-100 bg-red-50 p-2 text-red-600 transition-all hover:-translate-y-0.5 hover:bg-red-100"
                                    title={t.delete}
                                    type="button"
                                  >
                                    <Trash2 className="shrink-0" size={18} />
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-3 lg:hidden">
                {visibleUsers.map((item) => (
                  <div key={item.id} className="relative overflow-hidden rounded-[1.5rem] border border-[#e9e2d3] bg-white p-4 shadow-[0_14px_34px_rgba(15,15,15,0.06)]">
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(244,197,66,0.10),transparent_38%)]" />
                    <div className="relative z-10 space-y-4">
                      <div className="flex min-w-0 items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8a6a16]">{t.user}</p>
                          <p className="mt-1 line-clamp-2 break-words text-lg font-black text-[#050505]">{getUserDisplayName(item)}</p>
                          {item.email && <p className="mt-1 break-words text-sm font-semibold text-[#71717a]">{formatEmail(item.email)}</p>}
                        </div>
                        <div className="flex shrink-0 items-center justify-end">
                          {renderRoleBadge(item.rol)}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-[#f1ebdf] bg-[#fffdf8] p-3">
                        <div className="min-w-0">
                          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#8a6a16]">{t.business}</p>
                          <p className="mt-1 line-clamp-2 break-words text-sm font-black text-[#050505]">{getBusinessDisplayName(item)}</p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#8a6a16]">{t.created}</p>
                          <p className="mt-1 text-sm font-semibold text-[#71717a]">{formatArgentinaDate(item.created_at || '')}</p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                        {!canDeleteUser(item) && isProtectedUser(item) ? (
                          <div className="rounded-xl border border-[#f4c542]/30 bg-[#fff4c7] px-3 py-2 text-center text-xs font-black text-[#8a6a16]">
                            {getProtectedLabel(item)}
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => openEditModal(item)}
                              className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-black text-blue-600 transition-all hover:-translate-y-0.5 hover:bg-blue-100"
                              type="button"
                            >
                              <Edit2 className="shrink-0" size={16} />
                              {t.edit}
                            </button>

                            {canDeleteUser(item) && (
                              <button
                                onClick={() => handleDelete(item.id, getUserDisplayName(item))}
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-black text-red-600 transition-all hover:-translate-y-0.5 hover:bg-red-100"
                                type="button"
                              >
                                <Trash2 className="shrink-0" size={16} />
                                {t.delete}
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {filteredUsers.length > 0 && (
                <div className="mt-4 flex flex-col gap-3 border-t border-[#f1ebdf] pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-black text-[#71717a]">
                    {t.page} {safeCurrentPage.toLocaleString('en-US')} / {totalPages.toLocaleString('en-US')} · {pageStartIndex + 1}-{pageEndIndex} {t.of} {filteredUsers.length.toLocaleString('en-US')}
                  </p>
                  <div className="flex gap-2">
                    <Button type="button" variant="secondary" className="flex-1 sm:flex-none" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={safeCurrentPage <= 1}>
                      {t.previous}
                    </Button>
                    <Button type="button" variant="secondary" className="flex-1 sm:flex-none" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={safeCurrentPage >= totalPages}>
                      {t.next}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={closeUserModal}
        title={editingUser ? t.editUser : t.createUser}
      >
        <form
          onSubmit={handleSubmit}
          className={`min-w-0 space-y-4 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            isUserModalVisible
              ? 'translate-y-0 scale-100 opacity-100 blur-0'
              : 'translate-y-5 scale-[0.985] opacity-0 blur-[1px] sm:translate-y-7 sm:scale-[0.975]'
          }`}
        >
          {!editingUser && (
            <>
              <Input
                label={t.email}
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                placeholder={t.emailPlaceholder}
              />

              <Input
                label={t.username}
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                required
                placeholder={t.usernamePlaceholder}
              />

              <Input
                label={t.fullName}
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
                placeholder={t.fullNamePlaceholder}
              />

              <div className="relative">
                <Input
                  label={t.password}
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-9 rounded-xl p-1 text-[#71717a] transition hover:bg-[#fbfaf7] hover:text-[#050505]"
                >
                  {showPassword ? <EyeOff className="shrink-0" size={20} /> : <Eye className="shrink-0" size={20} />}
                </button>
              </div>
            </>
          )}

          {editingUser && (
            <>
              <div className="rounded-2xl border border-[#e9e2d3] bg-[#fbfaf7] p-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#8a6a16]">{t.selectedUser}</p>
                <p className="mt-2 font-black text-[#050505]">{getUserDisplayName(editingUser)}</p>
                <p className="mt-1 break-all text-sm font-semibold text-[#71717a]">{formatEmail(editingUser.email, editingUser.username || getBusinessDisplayName(editingUser))}</p>
                <p className="mt-1 text-sm font-semibold text-[#a1a1aa]">{getBusinessDisplayName(editingUser)}</p>
              </div>

              <Input
                label={t.email}
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder={t.emailPlaceholder}
              />

              <Input
                label={t.visibleName}
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder={t.visibleNamePlaceholder}
              />

              <Input
                label={t.username}
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder={t.usernameEditPlaceholder}
              />
            </>
          )}

          <Select
            label={t.role}
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
            required
          >
            {assignableRoles.includes('seller') && <option value="seller">{t.seller}</option>}
            {assignableRoles.includes('admin') && <option value="admin">{t.admin}</option>}
            {assignableRoles.includes('owner') && <option value="owner">{t.ownerBusiness}</option>}

            {isSuperAdmin && getUserRole(editingUser) === 'super_admin' && (
              <option value="super_admin">{t.superAdminPlatform}</option>
            )}
          </Select>

          <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:justify-end">
            <Button
              type="button"
              onClick={closeUserModal}
              variant="secondary"
              disabled={loading}
            >
              {t.cancel}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t.saving : editingUser ? t.update : t.create}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function UserMetricCard({
  title,
  value,
  icon: Icon,
  iconClass
}: {
  title: string;
  value: string;
  icon: ElementType;
  iconClass: string;
}) {
  return (
    <div className="group relative flex min-w-0 items-center justify-between gap-4 overflow-hidden rounded-[1.75rem] border border-[#e9e2d3]/85 bg-white/90 p-5 shadow-[0_18px_50px_rgba(15,15,15,0.055)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:border-[#f4c542]/35 hover:bg-white hover:shadow-[0_28px_70px_rgba(15,15,15,0.09)] sm:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(244,197,66,0.09),transparent_38%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative z-10 min-w-0 flex-1 overflow-hidden pr-2">
        <p className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-[#8a6a16] sm:text-[11px]">
          {title}
        </p>
        <p className="max-w-full break-words text-[2rem] font-black leading-[0.95] tracking-tight tabular-nums text-[#050505] sm:text-[2.35rem] xl:text-[2.25rem] 2xl:text-[2.55rem]">
          {value}
        </p>
      </div>
      <div className={`relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.15rem] shadow-[0_18px_40px_rgba(15,15,15,0.12)] transition-all duration-300 group-hover:scale-105 group-hover:-translate-y-0.5 sm:h-14 sm:w-14 ${iconClass}`}>
        <Icon className="h-5 w-5 shrink-0 sm:h-6 sm:w-6" />
      </div>
    </div>
  );
}
