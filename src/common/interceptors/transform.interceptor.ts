  import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  status: string;
  data: T;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    return next.handle().pipe(
      map((data) => ({
        status: 'success',
        data: this.transformData(data),
      })),
    );
  }

  private transformData(data: any): any {
    if (Array.isArray(data)) {
      return data.map((item) => this.transformData(item));
    }

    if (data !== null && typeof data === 'object') {
      if (data instanceof Date || Buffer.isBuffer(data)) {
        return data;
      }

      const obj = data.toObject ? data.toObject() : { ...data };

      const transformed: any = {};
      for (const key in obj) {
        if (key === '_id') {
          transformed['id'] = obj[key].toString();
        } else if (key === '__v') {
          continue;
        } else {
          transformed[key] = this.transformData(obj[key]);
        }
      }
      return transformed;
    }

    return data;
  }
}
