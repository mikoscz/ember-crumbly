import Ember from 'ember';
import layout from '../templates/components/bread-crumbs';
import getOwner from 'ember-getowner-polyfill';

const {
  get,
  Component,
  computed,
  getWithDefault,
  assert,
  typeOf,
  setProperties,
  A: emberArray,
  String: { classify }
} = Ember;
const {
  bool,
  readOnly
} = computed;

export default Component.extend({
  layout,
  tagName: 'ol',
  linkable: true,
  reverse: false,
  routesForInjection: [],
  classNameBindings: ['breadCrumbClass'],
  hasBlock: bool('template').readOnly(),
  currentUrl: readOnly('applicationRoute.router.url'),
  currentRouteName: readOnly('applicationRoute.controller.currentRouteName'),

  routeHierarchy: computed('currentUrl', 'currentRouteName', 'reverse', {
    get() {
      const currentRouteName = getWithDefault(this, 'currentRouteName', false);

      assert('[ember-crumbly] Could not find a curent route', currentRouteName);

      const routeNames = currentRouteName.split('.');
      const filteredRouteNames = this._filterIndexAndLoadingRoutes(routeNames);
      const crumbs = this._lookupBreadCrumb(routeNames, filteredRouteNames);
      const injectedCrumbs = this._injectCrumbs(crumbs);

      return get(this, 'reverse') ? injectedCrumbs.reverse() : injectedCrumbs;
    }
  }).readOnly(),

  breadCrumbClass: computed('outputStyle', {
    get() {
      let className = 'breadcrumb';
      const outputStyle = getWithDefault(this, 'outputStyle', '');
      const lowerCaseOutputStyle = outputStyle.toLowerCase();

      if (lowerCaseOutputStyle === 'foundation') {
        className = 'breadcrumbs';
      }

      return className;
    }
  }).readOnly(),

  _guessRoutePath(routeNames, name, index) {
    const routes = routeNames.slice(0, index + 1);

    if (routes.length === 1) {
      let path = `${name}.index`;

      return (this._lookupRoute(path)) ? path : name;
    }

    return routes.join('.');
  },

  _filterIndexAndLoadingRoutes(routeNames) {
    return routeNames.filter((name) => !(name === 'index' || name === 'loading'));
  },

  _lookupRoute(routeName) {
    return getOwner(this).lookup(`route:${routeName}`);
  },

  _injectCrumbs(crumbs) {
    const flatCrumbs = crumbs.mapBy('title');
    const crumbsForInjection = get(this, 'routesForInjection');


    crumbsForInjection.forEach((breadCrumb) => {
      const indexOfParent = flatCrumbs.indexOf(breadCrumb.parent);
      const totalLength = flatCrumbs.length;
      const childIndex = indexOfParent + breadCrumb.offset;

      crumbs.splice(childIndex, 0, breadCrumb);
    });

    return crumbs;
  },

  _lookupBreadCrumb(routeNames, filteredRouteNames) {
    const defaultLinkable = get(this, 'linkable');
    const pathLength = filteredRouteNames.length;
    const breadCrumbs = filteredRouteNames.map((name, index) => {
      const path = this._guessRoutePath(routeNames, name, index);
      const route = this._lookupRoute(path);
      const isHead = index === 0;
      const isTail = index === pathLength - 1;
      const crumbLinkable = (index === pathLength - 1) ? false : defaultLinkable;

      assert(`[ember-crumbly] \`route:${path}\` was not found`, route);

      let breadCrumb = getWithDefault(route, 'breadCrumb', {
        title: classify(name)
      });

      if (typeOf(breadCrumb) === 'null') {
        return;
      } else {
        setProperties(breadCrumb, {
          path,
          isHead,
          isTail,
          linkable: breadCrumb.hasOwnProperty('linkable') ? breadCrumb.linkable : crumbLinkable
        });
      }

      if (breadCrumb.injection) {
        const routesForInjection = get(this, 'routesForInjection');
        const injectionCrumbs = breadCrumb.injection.map((additionalCrumb) => {
          additionalCrumb.parent = classify(name);
          return additionalCrumb;
        });

        routesForInjection.pushObjects(injectionCrumbs);
      }

      return breadCrumb;
    });

    return emberArray(breadCrumbs.filter((breadCrumb) => typeOf(breadCrumb) !== 'undefined'));
  }
});
