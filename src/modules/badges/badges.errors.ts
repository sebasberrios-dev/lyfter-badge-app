export class BadgeNotFoundError extends Error {
  constructor() {
    super("badge no encontrado");
  }
}

export class DuplicateWelcomeBadgeError extends Error {
  constructor() {
    super("solo puede haber un badge de bienvenida por evento");
  }
}

export class BadgeCannotBeDeletedError extends Error {
  constructor() {
    super("no se pudo eliminar el badge porque tiene canjes asociados");
  }
}
