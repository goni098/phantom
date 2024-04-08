export class UnauthorizedError extends Error {
  constructor(public message = "unauthorized") {
    super(message);
  }
}
