export class CompanyAlreadyExistsError extends Error {
  constructor() {
    super("la empresa ya está registrada");
  }
}

export class CompanyNotFoundError extends Error {
  constructor() {
    super("no se encontró la empresa");
  }
}

export class CompanyCannotBeDeletedError extends Error {
  constructor() {
    super("no se puede eliminar la empresa: tiene eventos asociados");
  }
}
