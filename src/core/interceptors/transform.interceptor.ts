import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ResponseEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    [key: string]: any;
  };
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ResponseEnvelope<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ResponseEnvelope<T>> {
    return next.handle().pipe(
      map((resData) => {
        let message = 'Operation completed successfully';
        let dataPayload = resData;
        let metaPayload: any = undefined;

        if (resData && typeof resData === 'object' && !Array.isArray(resData)) {
          if (resData.message) {
            message = resData.message;
          }

          if ('data' in resData) {
            dataPayload = resData.data;
          } else if ('message' in resData && Object.keys(resData).length === 1) {
            dataPayload = null;
          }

          if (resData.meta) {
            metaPayload = resData.meta;
          }
        }

        const envelope: ResponseEnvelope<T> = {
          success: true,
          message,
          data: dataPayload,
        };

        if (metaPayload) {
          envelope.meta = metaPayload;
        }

        return envelope;
      }),
    );
  }
}
