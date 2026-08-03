import { Result as ResultNs, Ok, Err, TaggedError } from "better-result";

export { Ok, Err, TaggedError };

export const Result = ResultNs;
export type Result<T, E> = Ok<T, E> | Err<T, E>;

export const ok = ResultNs.ok;
export const err = ResultNs.err;
export const isOk = ResultNs.isOk;
export const isError = ResultNs.isError;
