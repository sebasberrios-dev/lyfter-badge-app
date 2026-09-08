export class EventNotFoundError extends Error {
  constructor() {
    super("evento no encontrado");
  }
}

export class InvalidEventDatesError extends Error {
  constructor() {
    super("la fecha de finalización debe ser posterior a la fecha del inicio");
  }
}

export class EventCannotBeDeletedError extends Error {
  constructor() {
    super(
      "no se puede eliminar el evento porque ya tiene badges o participantes asociados",
    );
  }
}

export class EventAlreadyFinishedError extends Error {
  constructor() {
    super("el evento ya está finalizado");
  }
}
