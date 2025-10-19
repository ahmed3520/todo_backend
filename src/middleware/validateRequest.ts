import { type NextFunction, type Request, type Response } from 'express';
import { type ZodTypeAny } from 'zod';

import { ApiError } from '../utils/ApiError';

type RequestPart = 'body' | 'query' | 'params';

type SchemaMap = Partial<Record<RequestPart, ZodTypeAny>>;

type ValidatedParts = Partial<Record<RequestPart, unknown>>;

type RequestWithValidated = Request & {
  validated?: ValidatedParts;
};

interface ValidationIssue {
  location: RequestPart;
  path: string;
  message: string;
}

export function validateRequest<TSchema extends SchemaMap>(schemaMap: TSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const issues: ValidationIssue[] = [];
    const validated: ValidatedParts = {};

    for (const [part, schema] of Object.entries(schemaMap) as Array<[RequestPart, ZodTypeAny]>) {
      const result = schema.safeParse(req[part]);

      if (result.success) {
        validated[part] = result.data;
        continue;
      }

      issues.push(
        ...result.error.issues.map((issue) => ({
          location: part,
          path: issue.path.join('.') || part,
          message: issue.message,
        }))
      );
    }

    if (issues.length > 0) {
      return next(
        new ApiError({
          message: 'Validation failed',
          statusCode: 422,
          details: issues,
        })
      );
    }

    (req as RequestWithValidated).validated = validated;

    return next();
  };
}

export function getValidatedData<TValidated extends ValidatedParts = ValidatedParts>(
  req: Request
): TValidated {
  const requestWithValidated = req as RequestWithValidated;

  if (!requestWithValidated.validated) {
    throw new ApiError({
      message: 'Validated data unavailable',
      statusCode: 500,
    });
  }

  return requestWithValidated.validated as TValidated;
}
