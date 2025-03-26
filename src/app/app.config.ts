import { ApplicationConfig } from '@angular/core';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptors, withXsrfConfiguration } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideZoneChangeDetection } from '@angular/core';

import { routes } from './app.routes';
import { AuthInterceptor } from './interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideHttpClient(
      withXsrfConfiguration({ cookieName: 'XSRF-TOKEN', headerName: 'X-XSRF-TOKEN' }),
      withInterceptors([])
    ),
    provideRouter(routes),
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
  ]
};