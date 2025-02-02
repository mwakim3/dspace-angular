import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MetadataImportPageComponent } from './admin-import-metadata-page/metadata-import-page.component';
import { AdminSearchPageComponent } from './admin-search-page/admin-search-page.component';
import { I18nBreadcrumbResolver } from '../core/breadcrumbs/i18n-breadcrumb.resolver';
import { AdminWorkflowPageComponent } from './admin-workflow-page/admin-workflow-page.component';
import { I18nBreadcrumbsService } from '../core/breadcrumbs/i18n-breadcrumbs.service';
import { AdminCurationTasksComponent } from './admin-curation-tasks/admin-curation-tasks.component';
import { REGISTRIES_MODULE_PATH, REPORTS_MODULE_PATH } from './admin-routing-paths';
import { BatchImportPageComponent } from './admin-import-batch-page/batch-import-page.component';
import {
  SiteAdministratorGuard
} from '../core/data/feature-authorization/feature-authorization-guard/site-administrator.guard';

@NgModule({
  imports: [
    RouterModule.forChild([
      {
        path: REGISTRIES_MODULE_PATH,
        loadChildren: () => import('./admin-registries/admin-registries.module')
          .then((m) => m.AdminRegistriesModule),
        canActivate: [SiteAdministratorGuard]
      },
      {
        path: REPORTS_MODULE_PATH,
        loadChildren: () => import('./admin-reports/admin-reports.module')
          .then((m) => m.AdminReportsModule),
      },
      {
        path: 'search',
        resolve: { breadcrumb: I18nBreadcrumbResolver },
        component: AdminSearchPageComponent,
        data: { title: 'admin.search.title', breadcrumbKey: 'admin.search' },
        canActivate: [SiteAdministratorGuard]
      },
      {
        path: 'workflow',
        resolve: { breadcrumb: I18nBreadcrumbResolver },
        component: AdminWorkflowPageComponent,
        data: { title: 'admin.workflow.title', breadcrumbKey: 'admin.workflow' },
        canActivate: [SiteAdministratorGuard]
      },
      {
        path: 'curation-tasks',
        resolve: { breadcrumb: I18nBreadcrumbResolver },
        component: AdminCurationTasksComponent,
        data: { title: 'admin.curation-tasks.title', breadcrumbKey: 'admin.curation-tasks' },
        canActivate: [SiteAdministratorGuard]
      },
      {
        path: 'metadata-import',
        resolve: { breadcrumb: I18nBreadcrumbResolver },
        component: MetadataImportPageComponent,
        data: { title: 'admin.metadata-import.title', breadcrumbKey: 'admin.metadata-import' },
        canActivate: [SiteAdministratorGuard]
      },
      {
        path: 'batch-import',
        resolve: { breadcrumb: I18nBreadcrumbResolver },
        component: BatchImportPageComponent,
        data: { title: 'admin.batch-import.title', breadcrumbKey: 'admin.batch-import' },
        canActivate: [SiteAdministratorGuard]
      },
      {
        path: 'system-wide-alert',
        resolve: { breadcrumb: I18nBreadcrumbResolver },
        loadChildren: () => import('../system-wide-alert/system-wide-alert.module').then((m) => m.SystemWideAlertModule),
        data: {title: 'admin.system-wide-alert.title', breadcrumbKey: 'admin.system-wide-alert'},
        canActivate: [SiteAdministratorGuard]
      },
    ])
  ],
  providers: [
    I18nBreadcrumbResolver,
    I18nBreadcrumbsService
  ]
})
export class AdminRoutingModule {

}
