// NB: express imports will be elided in the built js code, since we are only importing types.
import {NextFunction, Request, RequestHandler as ExpressRequestHandler, Response} from 'express';
import {assert, t, TypeFromTypeInfo, TypeInfo} from 'rtti';
import {ParamNames, RequestBody, ResponseBody} from '../util';
import {HttpSchema} from '../shared';


 /**
 * Accepts and returns a request handler function that is strongly-typed to match the given schema definition for the
 * given method and path. The function is returned as-is. This helper just provides convenient contextual typing.
 */
export function createRequestHandler<S extends HttpSchema, M extends 'GET' | 'POST', P extends S[any]['path']>(
    schema: S,
    method: M,
    path: P,
    handler: RequestHandler<S, M, P, {}>
): RequestHandler<S, M, P, {}>;
export function createRequestHandler<S extends HttpSchema, M extends 'GET' | 'POST', P extends S[any]['path'], ReqProps extends TypeInfo = t.object>(
    options: {
        schema: S,
        method: M,
        path: P,
        requestProps?: ReqProps
        handler: RequestHandler<S, M, P, TypeFromTypeInfo<ReqProps>>
    }
): RequestHandler<S, M, P, {}>;
export function createRequestHandler(optionsOrSchema: unknown, method?: unknown, path?: unknown, handler?: unknown): ExpressRequestHandler {
    let h = (handler ?? (optionsOrSchema as any).handler) as ExpressRequestHandler;
    let requestProps = handler ? undefined : (optionsOrSchema as any).requestProps as TypeInfo;

    // If there are no request props to validate, return the given request handler as-is.
    if (!requestProps) return h;

    // Return a wrapped handler that validates the request props before invoking the given handler function.
    return (req, res, next) => {
        assert(requestProps!, req);
        h(req, res, next);
    };
}


/** A strongly-typed express request handler. */
export type RequestHandler<S extends HttpSchema, M extends 'GET' | 'POST', P extends S[any]['path'], Req> =
    (req: TypedRequest<S, M, P, Req>, res: TypedResponse<S, M, P>, next: NextFunction) => void | Promise<void>;


/** A strongly-typed express request. Some original props are omited and replaced with typed ones. */
type TypedRequest<S extends HttpSchema, M extends 'GET' | 'POST', P extends S[any]['path'], Req> =
Omit<Request<Record<ParamNames<S, M, P>, string>>, 'body'>
& Req
& {
    body: RequestBody<S, M, P> extends undefined ? {} : RequestBody<S, M, P>;
    [Symbol.asyncIterator](): AsyncIterableIterator<any>; // must add this back; not preserved by mapped types above
};


/** A strongly-typed express response. Some original props are omited and replaced with typed ones. */
type TypedResponse<S extends HttpSchema, M extends 'GET' | 'POST', P extends S[any]['path']> =
Omit<Response, 'end' | 'json' | 'jsonp' | 'send' | 'status'> & {
    end: never;
    json: (body: ResponseBody<S, M, P>) => TypedResponse<S, M, P>;
    jsonp: (body: ResponseBody<S, M, P>) => TypedResponse<S, M, P>;
    send: (body: ResponseBody<S, M, P>) => TypedResponse<S, M, P>;
    status: (code: number) => TypedResponse<S, M, P>;
};
