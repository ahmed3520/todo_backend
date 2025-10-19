import { type NextFunction, type Request, type Response } from 'express';

type AsyncMiddleware<Req extends Request = Request, Res extends Response = Response> = (
  req: Req,
  res: Res,
  next: NextFunction
) => Promise<unknown>;

export function asyncHandler<TReq extends Request, TRes extends Response>(
  handler: AsyncMiddleware<TReq, TRes>
) {
  return (req: TReq, res: TRes, next: NextFunction) => {
    handler(req, res, next).catch(next);
  };
}
