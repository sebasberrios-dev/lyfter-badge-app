export class InvalidTokenError extends Error {
  constructor() {
    super("token inválido");
  }
}

export class ExpiredTokenError extends Error {
  constructor() {
    super("token expirado");
  }
}

export class BadgeDoesNotMatchEventError extends Error {
  constructor() {
    super("badge no corresponde al evento");
  }
}

export class EventNotStartedError extends Error {
  constructor() {
    super("el evento todavía no ha comenzado");
  }
}

export class EventAlreadyEndedError extends Error {
  constructor() {
    super("evento ya finalizó");
  }
}

export class UserNotRegisteredToEventError extends Error {
  constructor() {
    super("usuario no inscrito");
  }
}
