import { FilteredCollectionsComponent } from './filtered-collections/filtered-collections.component';
import { FilteredItemsComponent } from './filtered-items/filtered-items.component';
import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { I18nBreadcrumbResolver } from '../../core/breadcrumbs/i18n-breadcrumb.resolver';

@NgModule({
  imports: [
    RouterModule.forChild([
      {
        path: 'collections',
        resolve: { breadcrumb: I18nBreadcrumbResolver },
        data: {title: 'admin.reports.collections.title', breadcrumbKey: 'admin.reports.collections'},
        children: [
          {
            path: '',
            component: FilteredCollectionsComponent
          }
        ]
      },
      {
        path: 'queries',
        resolve: { breadcrumb: I18nBreadcrumbResolver },
        data: {title: 'admin.reports.items.title', breadcrumbKey: 'admin.reports.items'},
        children: [
          {
            path: '',
            component: FilteredItemsComponent
          }
        ]
      }
    ])
  ]
})
export class AdminReportsRoutingModule {

}
