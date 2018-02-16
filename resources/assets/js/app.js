  import Multiselect from 'vue-multiselect';

/**
 * First we will load all of this project's JavaScript dependencies which
 * includes Vue and other libraries. It is a great starting point when
 * building robust, powerful web applications using Vue and Laravel.
 */

// require('./bootstrap');
require('popper.js')
require('bootstrap')

window.Vue = require('vue');
window._ = require('lodash');

/**
 * Next, we will create a fresh Vue application instance and attach it to
 * the page. Then, you may begin adding components to this application
 * or customize the JavaScript scaffolding to fit your unique needs.
 */

// Imported Components
Vue.component('multiselect', Multiselect);

// Reusable Components
Vue.component('bibliography', require('./components/BibliographyTable.vue'));
Vue.component('context-tree', require('./components/ContextTree.vue'));
Vue.component('ol-map', require('./components/OlMap.vue'));

// Page Components
Vue.component('preferences', require('./components/Preferences.vue'))
Vue.component('user-preferences', require('./components/UserPreferences.vue'))
Vue.component('users', require('./components/Users.vue'))
Vue.component('roles', require('./components/Roles.vue'))

const app = new Vue({
    el: '#app',
    data: {
        tab: 'map',
        selectedContext: {},
        onSelectContext: function(selection) {
            app.$data.selectedContext = JSON.parse(JSON.stringify(selection));
        }
    }
});
