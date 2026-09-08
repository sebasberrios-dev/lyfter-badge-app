export class EmailAlreadyExistsError extends Error {
  constructor() {
    super("el usuario ya está registrado, inicie sesión");
  }
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super("correo o contraseña incorrectos");
  }
}

export class UserNotFoundError extends Error {
  constructor() {
    super("usuario no encontrado");
  }
}

export class UserIsAlreadyCompanyAdminError extends Error {
  constructor() {
    super("el usuario ya es admin de otra empresa");
  }
}

export class UserIsSuperAdminError extends Error {
  constructor() {
    super("el usuario es super admin");
  }
}
