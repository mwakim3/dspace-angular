import { ActivatedRouteSnapshot, Resolve, RouterStateSnapshot } from '@angular/router';
import { combineLatest, Observable, of as observableOf } from 'rxjs';
import { FeatureID } from '../../core/data/feature-authorization/feature-id';
import { MenuService } from '../menu/menu.service';
import { AuthorizationDataService } from '../../core/data/feature-authorization/authorization-data.service';
import { Injectable } from '@angular/core';
import { LinkMenuItemModel } from '../menu/menu-item/models/link.model';
import { Item } from '../../core/shared/item.model';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { OnClickMenuItemModel } from '../menu/menu-item/models/onclick.model';
import {
  getFirstCompletedRemoteData, getRemoteDataPayload,
} from '../../core/shared/operators';
import { map, switchMap } from 'rxjs/operators';
import { DSpaceObjectDataService } from '../../core/data/dspace-object-data.service';
import { URLCombiner } from '../../core/url-combiner/url-combiner';
import { DsoVersioningModalService } from './dso-versioning-modal-service/dso-versioning-modal.service';
import { hasNoValue, hasValue, isNotEmpty } from '../empty.util';
import { MenuID } from '../menu/menu-id.model';
import { MenuItemType } from '../menu/menu-item-type.model';
import { MenuSection } from '../menu/menu-section.model';
import { getDSORoute } from '../../app-routing-paths';
import { ResearcherProfileDataService } from '../../core/profile/researcher-profile-data.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TranslateService } from '@ngx-translate/core';
import { DsoWithdrawnReinstateModalService, REQUEST_REINSTATE, REQUEST_WITHDRAWN } from './dso-withdrawn-reinstate-service/dso-withdrawn-reinstate-modal.service';
import { AuthService } from '../../core/auth/auth.service';
import { FindListOptions } from '../../core/data/find-list-options.model';
import { RequestParam } from '../../core/cache/models/request-param.model';
import { CorrectionTypeDataService } from '../../core/submission/correctiontype-data.service';
import { SubscriptionModalComponent } from '../subscriptions/subscription-modal/subscription-modal.component';
import { Community } from '../../core/shared/community.model';
import { Collection } from '../../core/shared/collection.model';

/**
 * Creates the menus for the dspace object pages
 */
@Injectable({
  providedIn: 'root'
})
export class DSOEditMenuResolver implements Resolve<{ [key: string]: MenuSection[] }> {

  constructor(
    protected dSpaceObjectDataService: DSpaceObjectDataService,
    protected menuService: MenuService,
    protected authorizationService: AuthorizationDataService,
    protected modalService: NgbModal,
    protected dsoVersioningModalService: DsoVersioningModalService,
    protected researcherProfileService: ResearcherProfileDataService,
    protected notificationsService: NotificationsService,
    protected translate: TranslateService,
    protected dsoWithdrawnReinstateModalService: DsoWithdrawnReinstateModalService,
    private auth: AuthService,
    private correctionTypeDataService: CorrectionTypeDataService
  ) {
  }

  /**
   * Initialise all dspace object related menus
   */
  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<{ [key: string]: MenuSection[] }> {
    let id = route.params.id;
    if (hasNoValue(id) && hasValue(route.queryParams.scope)) {
      id = route.queryParams.scope;
    }
    if (hasNoValue(id)) {
      // If there's no ID, we're not on a DSO homepage, so pass on any pre-existing menu route data
      return observableOf({ ...route.data?.menu });
    } else {
      return this.dSpaceObjectDataService.findById(id, true, false).pipe(
        getFirstCompletedRemoteData(),
        switchMap((dsoRD) => {
          if (dsoRD.hasSucceeded) {
            const dso = dsoRD.payload;
            return combineLatest(this.getDsoMenus(dso, route, state)).pipe(
              // Menu sections are retrieved as an array of arrays and flattened into a single array
              map((combinedMenus) => [].concat.apply([], combinedMenus)),
              map((menus) => this.addDsoUuidToMenuIDs(menus, dso)),
              map((menus) => {
                return {
                  ...route.data?.menu,
                  [MenuID.DSO_EDIT]: menus
                };
              })
            );
          } else {
            return observableOf({...route.data?.menu});
          }
        })
      );
    }
  }

  /**
   * Return all the menus for a dso based on the route and state
   */
  getDsoMenus(dso, route, state): Observable<MenuSection[]>[] {
    return [
      this.getItemMenu(dso),
      this.getComColMenu(dso),
      this.getCommonMenu(dso, state)
    ];
  }

  /**
   * Get the common menus between all dspace objects
   */
  protected getCommonMenu(dso, state): Observable<MenuSection[]> {
    return combineLatest([
      this.authorizationService.isAuthorized(FeatureID.CanEditMetadata, dso.self),
    ]).pipe(
      map(([canEditItem]) => {
        return [
          {
            id: 'edit-dso',
            active: false,
            visible: canEditItem,
            model: {
              type: MenuItemType.LINK,
              text: this.getDsoType(dso) + '.page.edit',
              link: new URLCombiner(getDSORoute(dso), 'edit', 'metadata').toString()
            } as LinkMenuItemModel,
            icon: 'pencil-alt',
            index: 2
          },
        ];
      })
    );
  }

  /**
   * Get item specific menus
   */
  protected getItemMenu(dso): Observable<MenuSection[]> {
    if (dso instanceof Item) {
      const findListTopicOptions: FindListOptions = {
        searchParams: [new RequestParam('target', dso.uuid)]
      };
      return combineLatest([
        this.authorizationService.isAuthorized(FeatureID.CanCreateVersion, dso.self),
        this.dsoVersioningModalService.isNewVersionButtonDisabled(dso),
        this.dsoVersioningModalService.getVersioningTooltipMessage(dso, 'item.page.version.hasDraft', 'item.page.version.create'),
        this.authorizationService.isAuthorized(FeatureID.CanSynchronizeWithORCID, dso.self),
        this.authorizationService.isAuthorized(FeatureID.CanClaimItem, dso.self),
        this.correctionTypeDataService.findByItem(dso.uuid, false).pipe(
          getFirstCompletedRemoteData(),
          getRemoteDataPayload())
      ]).pipe(
        map(([canCreateVersion, disableVersioning, versionTooltip, canSynchronizeWithOrcid, canClaimItem, correction]) => {
          const isPerson = this.getDsoType(dso) === 'person';
          return [
            {
              id: 'orcid-dso',
              active: false,
              visible: isPerson && canSynchronizeWithOrcid,
              model: {
                type: MenuItemType.LINK,
                text: 'item.page.orcid.tooltip',
                link: new URLCombiner(getDSORoute(dso), 'orcid').toString()
              } as LinkMenuItemModel,
              icon: 'orcid fab fa-lg',
              index: 0
            },
            {
              id: 'version-dso',
              active: false,
              visible: canCreateVersion,
              model: {
                type: MenuItemType.ONCLICK,
                text: versionTooltip,
                disabled: disableVersioning,
                function: () => {
                  this.dsoVersioningModalService.openCreateVersionModal(dso);
                }
              } as OnClickMenuItemModel,
              icon: 'code-branch',
              index: 1
            },
            {
              id: 'claim-dso',
              active: false,
              visible: isPerson && canClaimItem,
              model: {
                type: MenuItemType.ONCLICK,
                text: 'item.page.claim.button',
                function: () => {
                  this.claimResearcher(dso);
                }
              } as OnClickMenuItemModel,
              icon: 'hand-paper',
              index: 3
            },
            {
              id: 'withdrawn-item',
              active: false,
              visible: dso.isArchived && correction?.page.some((c) => c.topic === REQUEST_WITHDRAWN),
              model: {
                type: MenuItemType.ONCLICK,
                text:'item.page.withdrawn',
                function: () => {
                  this.dsoWithdrawnReinstateModalService.openCreateWithdrawnReinstateModal(dso, 'request-withdrawn', dso.isArchived);
                }
              } as OnClickMenuItemModel,
              icon: 'eye-slash',
              index: 4
            },
            {
              id: 'reinstate-item',
              active: false,
              visible: dso.isWithdrawn && correction?.page.some((c) => c.topic === REQUEST_REINSTATE),
              model: {
                type: MenuItemType.ONCLICK,
                text:'item.page.reinstate',
                function: () => {
                  this.dsoWithdrawnReinstateModalService.openCreateWithdrawnReinstateModal(dso, 'request-reinstate', dso.isArchived);
                }
              } as OnClickMenuItemModel,
              icon: 'eye',
              index: 5
            }
          ];
        }),
      );
    } else {
      return observableOf([]);
    }
  }

  /**
   * Get Community/Collection-specific menus
   */
  protected getComColMenu(dso): Observable<MenuSection[]> {
    if (dso instanceof Community || dso instanceof Collection) {
      return combineLatest([
        this.authorizationService.isAuthorized(FeatureID.CanSubscribe, dso.self),
      ]).pipe(
        map(([canSubscribe]) => {
          return [
            {
              id: 'subscribe',
              active: false,
              visible: canSubscribe,
              model: {
                type: MenuItemType.ONCLICK,
                text: 'subscriptions.tooltip',
                function: () => {
                  const modalRef = this.modalService.open(SubscriptionModalComponent);
                  modalRef.componentInstance.dso = dso;
                }
              } as OnClickMenuItemModel,
              icon: 'bell',
              index: 4
            },
          ];
        })
      );
    } else {
      return observableOf([]);
    }
  }

  /**
   * Claim a researcher by creating a profile
   * Shows notifications and/or hides the menu section on success/error
   */
  protected claimResearcher(dso) {
    this.researcherProfileService.createFromExternalSourceAndReturnRelatedItemId(dso.self)
      .subscribe((id: string) => {
        if (isNotEmpty(id)) {
          this.notificationsService.success(this.translate.get('researcherprofile.success.claim.title'),
            this.translate.get('researcherprofile.success.claim.body'));
          this.authorizationService.invalidateAuthorizationsRequestCache();
          this.menuService.hideMenuSection(MenuID.DSO_EDIT, 'claim-dso-' + dso.uuid);
        } else {
          this.notificationsService.error(
            this.translate.get('researcherprofile.error.claim.title'),
            this.translate.get('researcherprofile.error.claim.body'));
        }
      });
  }

  /**
   * Retrieve the dso or entity type for an object to be used in generic messages
   */
  protected getDsoType(dso) {
    const renderType = dso.getRenderTypes()[0];
    if (typeof renderType === 'string' || renderType instanceof String) {
      return renderType.toLowerCase();
    } else {
      return dso.type.toString().toLowerCase();
    }
  }

  /**
   * Add the dso uuid to all provided menu ids and parent ids
   */
  protected addDsoUuidToMenuIDs(menus, dso) {
    return menus.map((menu) => {
      Object.assign(menu, {
        id: menu.id + '-' + dso.uuid
      });
      if (hasValue(menu.parentID)) {
        Object.assign(menu, {
          parentID: menu.parentID + '-' + dso.uuid
        });
      }
      return menu;
    });
  }

}
