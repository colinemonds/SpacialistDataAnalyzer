var spacialistApp = angular.module('tutorialApp', ['satellizer', 'ui.router', 'ngRoute', 'ngMessages', 'ngCookies', 'ui-leaflet', 'ui.select', 'ngSanitize', 'pascalprecht.translate', 'ngFlag', 'hljs', 'hc.marked', 'pdf', 'ui.bootstrap', 'ngFileUpload', 'ui.tree', 'infinite-scroll', 'ui.bootstrap.contextMenu']);

$.material.init();

spacialistApp.service('searchService', ['$translate', function($translate) {
    var search = {};

    search.formatUnixDate = function(ts) {
        var d = new Date(ts);
        return d.toLocaleDateString($translate.use());
    };

    search.availableSearchTerms = {
        tags: [],
        dates: [],
        cameras: []
    };

    return search;
}]);

spacialistApp.service('snackbarService', [function() {
    var defaults = {
        autoclose: {
            timeout: 2000,
            htmlAllowed: true
        },
        persistent: {
            timeout: 0,
            htmlAllowed: true
        }
    };

    function getAutocloseSnack() {
        return angular.merge({}, defaults.autoclose);
    }
    function getPersistentSnack() {
        return angular.merge({}, defaults.persistent);
    }
    function getPrefix(snackType) {
        switch(snackType) {
            case 'success':
                return '<i class="material-icons text-success">check</i> ';
            case 'info':
                return '<i class="material-icons text-info">info_outline</i> ';
            case 'warning':
                return '<i class="material-icons text-warning">warning</i> ';
            case 'error':
                return '<i class="material-icons text-danger">error_outline</i> ';
            default:
                return '';
        }
    }

    var snack = {};
    snack.snacks = {};

    snack.addAutocloseSnack = function(content, snackType) {
        var options = getAutocloseSnack();
        content = getPrefix(snackType) + content;
        options.content = content;
        $.snackbar(options);
    };
    snack.addPersistentSnack = function(id, content, snackType) {
        if(snack.snacks[id]) return;
        var options = getPersistentSnack();
        content = getPrefix(snackType) + content;
        options.content = content;
        snack.snacks[id] = $.snackbar(options);
    };
    snack.closeSnack = function(id, keepAsKey) {
        if(!snack.snacks[id]) return;
        snack.snacks[id].snackbar('hide');
        if(keepAsKey !== false) {
            delete snack.snacks[id];
        }
    };

    return snack;
}]);

spacialistApp.service('modalService', ['$uibModal', 'httpGetFactory', function($uibModal, httpGetFactory) {
    var defaults = {
        backdrop: true,
        keyboard: true,
        modalFade: true,
        templateUrl: 'layouts/image-properties.html',
        windowClass: 'wide-modal'
    };
    var options = {};

    this.showModal = function(customDefaults, customOptions) {
        if(!customDefaults) customDefaults = {};
        //customDefaults.backdrop = 'static';
        return this.show(customDefaults, customOptions);
    };

    this.show = function(customDefaults, customOptions) {
        var tempDefaults = {};
        var tempOptions = {};

        angular.extend(tempDefaults, defaults, customDefaults);
        angular.extend(tempOptions, options, customOptions);
        tempOptions.modalNav = {
            propTab: true,
            linkTab: false,
            setPropTab: function() {
                tempOptions.modalNav.propTab = true;
                tempOptions.modalNav.linkTab = false;
            },
            setLinkTab: function() {
                tempOptions.modalNav.propTab = false;
                tempOptions.modalNav.linkTab = true;
            }
        };

        if(!tempDefaults.controller) {
            tempDefaults.controller = function($scope, $uibModalInstance) {
                $scope.modalOptions = tempOptions;
                $scope.modalOptions.close = function(result) {
                    $uibModalInstance.dismiss('cancel');
                };
            };
        }
        var modalInstance = $uibModal.open(tempDefaults);
        modalInstance.result.then(function(selectedItem) {
        }, function() {
        });
        return modalInstance;
    };
}]);

spacialistApp.service('modalFactory', ['$uibModal', function($uibModal) {
    this.deleteModal = function(elementName, onConfirm, additionalWarning) {
        if(typeof additionalWarning != 'undefined' && additionalWarning !== '') {
            var warning = additionalWarning;
        }
        var modalInstance = $uibModal.open({
            templateUrl: 'layouts/delete-confirm.html',
            controller: function($uibModalInstance) {
                this.name = elementName;
                this.warning = warning;
                this.cancel = function(result) {
                    $uibModalInstance.dismiss('cancel');
                };
                this.deleteConfirmed = function() {
                    onConfirm();
                    $uibModalInstance.dismiss('ok');
                };
            },
            controllerAs: 'mc'
        });
        modalInstance.result.then(function(selectedItem) {}, function() {});
    };
    this.createModal = function(heading, text, selection, onCreate) {
        var modalInstance = $uibModal.open({
            templateUrl: 'layouts/create-element.html',
            controller: function($uibModalInstance) {
                this.heading = heading;
                this.desc = text;
                this.choices = selection;
                this.cancel = function(result) {
                    $uibModalInstance.dismiss('cancel');
                };
                this.onCreate = function(name, type) {
                    onCreate(name, type);
                    $uibModalInstance.dismiss('ok');
                };
                this.setSelected = function(ngModel) {
                    this.type = ngModel.$modelValue;
                };
            },
            controllerAs: 'mc'
        });
        modalInstance.result.then(function(selectedItem) {}, function() {});
    };
    this.addUserModal = function(onCreate, users) {
        var modalInstance = $uibModal.open({
            templateUrl: 'modals/add-user.html',
            controller: function($uibModalInstance) {
                this.cancel = function(result) {
                    $uibModalInstance.dismiss('cancel');
                };
                this.onCreate = function(name, email, password) {
                    onCreate(name, email, password, users);
                    $uibModalInstance.dismiss('ok');
                };
            },
            controllerAs: 'mc'
        });
        modalInstance.result.then(function() {}, function() {});
    };
    this.editUserModal = function(onEdit, user, index) {
        var modalInstance = $uibModal.open({
            templateUrl: 'layouts/edit-user.html',
            controller: function($uibModalInstance) {
                this.userinfo = angular.copy(user);
                this.cancel = function(result) {
                    $uibModalInstance.dismiss('cancel');
                };
                this.onEdit = function(userinfo) {
                    var changes = {};
                    for(var key in user) {
                        if(user.hasOwnProperty(key)) {
                            if(user[key] != userinfo[key]) {
                                changes[key] = userinfo[key];
                            }
                        }
                    }
                    onEdit(changes, user.id, index);
                    $uibModalInstance.dismiss('ok');
                };
            },
            controllerAs: 'mc'
        });
        modalInstance.result.then(function() {}, function() {});
    };
    this.addRoleModal = function(onAdd, roles) {
        var modalInstance = $uibModal.open({
            templateUrl: 'modals/add-role.html',
            controller: function($uibModalInstance) {
                this.cancel = function(result) {
                    $uibModalInstance.dismiss('cancel');
                };
                this.onAdd = function(newRole) {
                    onAdd(newRole, roles);
                    $uibModalInstance.dismiss('ok');
                };
            },
            controllerAs: 'mc'
        });
        modalInstance.result.then(function() {}, function() {});
    };
    this.addLiteratureModal = function(onCreate, types, bibliography) {
        var modalInstance = $uibModal.open({
            templateUrl: 'modals/add-bibliography.html',
            controller: function($uibModalInstance) {
                this.availableTypes = types;
                this.selectedType = types[0];
                this.cancel = function(result) {
                    $uibModalInstance.dismiss('cancel');
                };
                this.onCreate = function(fields, type) {
                    onCreate(fields, type, bibliography);
                    $uibModalInstance.dismiss('ok');
                };
            },
            controllerAs: 'mc'
        });
        modalInstance.result.then(function() {}, function() {});
    };
    this.errorModal = function(msg) {
        var modalInstance = $uibModal.open({
            templateUrl: 'layouts/error.html',
            controller: function($uibModalInstance) {
                this.msg = msg;
                this.cancel = function(result) {
                    $uibModalInstance.dismiss('cancel');
                };
            },
            controllerAs: 'mc'
        });
        modalInstance.result.then(function(selectedItem) {}, function() {});
    };
    this.warningModal = function(msg, onConfirm, onDiscard) {
        var modalInstance = $uibModal.open({
            templateUrl: 'layouts/warning.html',
            controller: function($uibModalInstance) {
                this.msg = msg;
                this.cancel = function(result) {
                    $uibModalInstance.dismiss('cancel');
                };
                this.onConfirm = function() {
                    onConfirm();
                    $uibModalInstance.dismiss('ok');
                };
                this.onDiscard = function() {
                    onDiscard();
                    $uibModalInstance.dismiss('ok');
                };
            },
            controllerAs: 'mc'
        });
        modalInstance.result.then(function(selectedItem) {}, function() {});
    };
    this.newContextTypeModal = function(searchFn, onCreate, availableGeometryTypes, contexttypes) {
        var modalInstance = $uibModal.open({
            templateUrl: 'layouts/new-context-type.html',
            controller: function($uibModalInstance) {
                this.contextTypeTypes = [
                    { id: 0, label: 'context-type.type.context'},
                    { id: 1, label: 'context-type.type.find'}
                ];
                this.availableGeometryTypes = availableGeometryTypes;
                this.onSearch = searchFn;
                this.onCreate = function(label, type, geomtype) {
                    onCreate(label, type, geomtype, contexttypes);
                    $uibModalInstance.dismiss('ok');
                };
                this.cancel = function(result) {
                    $uibModalInstance.dismiss('cancel');
                };
            },
            controllerAs: 'mc'
        });
        modalInstance.result.then(function(selectedItem) {}, function() {});
    };
    this.editContextTypeModal = function(onEdit, labelCallback, ct, name) {
        var origName = name;
        var modalInstance = $uibModal.open({
            templateUrl: 'layouts/edit-contexttype.html',
            controller: function($uibModalInstance) {
                this.name = name;
                this.onSearch = labelCallback;
                this.cancel = function(result) {
                    $uibModalInstance.dismiss('cancel');
                };
                this.onEdit = function(newType) {
                    if(origName != newType.label) onEdit(ct, newType);
                    $uibModalInstance.dismiss('ok');
                };
            },
            controllerAs: 'mc'
        });
        modalInstance.result.then(function() {}, function() {});
    };
    this.addNewAttributeModal = function(searchFn, onCreate, datatypes, attributes) {
        var modalInstance = $uibModal.open({
            templateUrl: 'modals/add-attribute.html',
            controller: function($uibModalInstance) {
                this.needsRoot = {
                    'string-sc': 1,
                    'string-mc': 1,
                    epoch: 1
                };
                this.datatypes = datatypes;
                this.onSearch = searchFn;
                this.onCreate = function(label, datatype, parent) {
                    onCreate(label, datatype, parent, attributes);
                    $uibModalInstance.dismiss('ok');
                };
                this.cancel = function(result) {
                    $uibModalInstance.dismiss('cancel');
                };
            },
            controllerAs: 'mc'
        });
        modalInstance.result.then(function(selectedItem) {}, function() {});
    };
    this.addAttributeToContextTypeModal = function(concepts, contextType, ctAttributes, attrs, onCreate) {
        var modalInstance = $uibModal.open({
            templateUrl: 'layouts/add-attribute-contexttype.html',
            controller: function($uibModalInstance) {
                this.ct = contextType;
                this.concepts = concepts;
                this.attributes = attrs;
                this.onCreate = function(attr) {
                    onCreate(attr, contextType, ctAttributes);
                    $uibModalInstance.dismiss('ok');
                };
                this.cancel = function(result) {
                    $uibModalInstance.dismiss('cancel');
                };
            },
            controllerAs: 'mc'
        });
        modalInstance.result.then(function(selectedItem) {}, function() {});
    };
}]);

spacialistApp.directive('spinner', function() {
    return {
        template: '<div class="spinner-container">' +
            '<svg class="circle-img-path" viewBox="25 25 50 50">' +
                '<circle class="circle-path" cx="50" cy="50" r="20" fill="none" stroke-width="4" stroke-miterlimit="10" />' +
            '</svg>' +
        '</div>'
    };
});

spacialistApp.directive('resizeWatcher', function($window, $timeout) {
    function getViewportDim() {
        return {
            'height': $window.innerHeight,
            'width': $window.innerWidth,
            'isSm': window.matchMedia("(max-width: 991px)").matches
        };
    };

    function onResize(scope) {
        var newValue = getViewportDim();
        if(newValue.isSm) {
            $('#tree-container').css('height', '');
            $('#attribute-container').css('height', '');
            $('#addon-container').css('height', '');
            $('#literature-container').css('height', '');
            $('analysis-frame').css('height', '');
            $('#attribute-editor').css('height', '');
            $('#layer-editor').css('height', '');
        } else {
            var height = newValue.height;
            var width = newValue.width;

            var headerHeight = document.getElementById('header-nav').offsetHeight;
            var addonNavHeight = 0;
            var addonNav = document.getElementById('addon-nav');
            if(addonNav) addonNavHeight = addonNav.offsetHeight;
            var containerHeight = scope.containerHeight = height - headerHeight - headerPadding - bottomPadding;
            var addonContainerHeight = scope.addonContainerHeight = containerHeight - addonNavHeight;
            var attributeEditor = document.getElementById('attribute-editor');
            if(attributeEditor) {
                $(attributeEditor).css('height', containerHeight);
                var heading = document.getElementById('editor-heading');
                $('.attribute-editor-column').css('height', containerHeight - (heading.offsetHeight+headerPadding));
            }
            var layerEditor = document.getElementById('layer-editor');
            if(layerEditor) {
                $(layerEditor).css('height', containerHeight);
                var heading = document.getElementById('editor-heading');
                $('.layer-editor-column').css('height', containerHeight - (heading.offsetHeight+headerPadding));
            }
            var literatureContainer = document.getElementById('literature-container');
            if(literatureContainer) {
                var literatureHeight = containerHeight;
                var literatureAddButton = document.getElementById('literature-add-button');
                if(literatureAddButton) literatureHeight -= literatureAddButton.offsetHeight;
                var literatureSearch = document.getElementById('literature-search-form');
                if(literatureSearch) literatureHeight -= literatureSearch.offsetHeight;
                var literatureTable = document.getElementById('literature-table');
                if(literatureTable) {
                    var head = literatureTable.tHead;
                    angular.element(literatureContainer).bind('scroll', function(e) {
                        var t = 'translate(0, ' + this.scrollTop + 'px)';
                        head.style.transform = t;
                    });
                    var headHeight = head.offsetHeight;
                    var body = literatureTable.tBodies[0];
                    $(body).css('max-height', literatureHeight - headHeight);
                    $(literatureContainer).css('height', literatureHeight);
                }
            }

            $('#tree-container').css('height', containerHeight);
            $('#attribute-container').css('height', containerHeight);
            $('#addon-container').css('height', containerHeight);
            $('#analysis-frame').css('height', containerHeight);
            $timeout(function() {
              scope.$digest();
            }, 0);
        }
    }

    var headerPadding = 20;
    var bottomPadding = 20;

    return {
        scope: true,
        link: function(scope, element, attrs) {
            onResize(scope);
            angular.element($window).bind('resize', function() {
                onResize(scope);
            });
        }
    };
});

spacialistApp.directive('myDirective', function(httpPostFactory) {
    return {
        restrict: 'A',
        scope: false,
        link: function(scope, element, attr) {
            element.bind('change', function() {
                var formData = new FormData();
                formData.append('file', element[0].files[0]);
            });
        }
    };
});

spacialistApp.directive('myTree', function($parse) {
    return {
        restrict: 'E',
        templateUrl: 'includes/tree.html',
        scope: {
            onClickCallback: '&',
            contexts: '=',
            concepts: '=',
            element: '=',
            toState: '=',
            callbacks: '=',
            options: '=',
            setContextMenu: '='
        },
        // controller: 'mainCtrl'
    };
});

spacialistApp.directive('imageList', function(imageService) {
    return {
        restrict: 'E',
        templateUrl: 'includes/image-list.html',
        scope: {
            onScrollLoad: '&',
            scrollContainer: '=',
            imageData: '=',
            imageType: '=',
            showTags: '=',
            searchTerms: '='
        },
        controller: 'imageCtrl',
        link: function(scope, elements, attrs) {
            scope.availableTags = imageService.availableTags;
            scope.$root.$on('image:delete:linked', function(event, args) {
                scope.tmpData.linked = [];
            });
        }
    };
});

spacialistApp.directive('formField', function($log) {
    var updateInputFields = function(scope, element, attrs) {
        scope.attributeFields = scope.$eval(attrs.fields);
        scope.attributeOutputs = scope.$eval(attrs.output);
        scope.attributeSources = scope.$eval(attrs.sources);
        scope.readonlyInput = scope.$eval(attrs.spReadonly);
        var pattern = /^\d+$/;
        if(typeof attrs.labelWidth != 'undefined' && pattern.test(attrs.labelWidth)) {
            scope.labelWidth = parseInt(attrs.labelWidth);
        } else {
            scope.labelWidth = 4;
        }
        if(typeof attrs.inputWidth != 'undefined' && pattern.test(attrs.inputWidth)) {
            scope.inputWidth = parseInt(attrs.inputWidth);
        } else {
            scope.inputWidth = 8;
        }
        if(typeof attrs.offset != 'undefined' && pattern.test(attrs.offset)) {
            scope.offset = parseInt(attrs.offset);
        } else {
            scope.offset = 0;
        }
        if(scope.labelWidth + scope.inputWidth + scope.offset > 12) {
            console.log("> 12");
            return false;
        }
    };

    return {
        restrict: 'E',
        templateUrl: 'includes/form-fields.html',
        scope: false,
        link: function(scope, element, attrs) {
            scope.listInput = {};
            scope.isEditable = typeof attrs.editable != 'undefined' && (attrs.editable.length === 0 || attrs.editable == 'true');
            scope.isDeletable = typeof attrs.deletable != 'undefined' && (attrs.deletable.length === 0 || attrs.deletable == 'true');
            scope.isOrderable = typeof attrs.orderable != 'undefined' && (attrs.orderable.length === 0 || attrs.orderable == 'true');
            if(scope.isDeletable && typeof attrs.onDelete == 'undefined') {
                throw new Error('onDelete method is missing! The on-delete attribute is mandatory if you use the deletable attribute.');
            }
            if(scope.isOrderable) {
                if(!attrs.onOrder) {
                    throw new Error('onOrder method is missing! The on-order attribute is mandatory if you use the orderable attribute.');
                }
                scope.onOrder = scope.$eval(attrs.onOrder);
                if(!scope.onOrder.up || !scope.onOrder.down) {
                    throw new Error('onOrder must be an object with two fields: up and down, which are both functions.');
                }
            }
            scope.concepts = scope.$eval(attrs.concepts);
            scope.onDelete = scope.$eval(attrs.onDelete);
            scope.$watch(function(scope) {
                return scope.$eval(attrs.fields);
            }, function(newVal, oldVal) {
                updateInputFields(scope, element, attrs);
            });
            scope.$watch(function(scope) {
                return scope.$eval(attrs.output);
            }, function(newVal, oldVal) {
                updateInputFields(scope, element, attrs);
            });
            scope.$watch(function(scope) {
                return scope.$eval(attrs.sources);
            }, function(newVal, oldVal) {
                updateInputFields(scope, element, attrs);
            });
        }
    };
});

spacialistApp.directive('resizeable', function($compile) {
    var extendContainer = function(extend, shrink) {
        var cls = extend.className;
        var gridClass = getCurrentDeviceClass();
        var matchingClass = nextMatchingDeviceClass(cls, gridClass);
        if(matchingClass === null) {
            console.log("grid breakpoint not specified");
            return;
        }
        var mClass = 'col-' + matchingClass + '-';
        var regex = new RegExp(mClass+ '\\d+');
        var selfClass = cls.match(regex);
        if(selfClass === null) {
            console.log(matchingClass + " not found in " + cls);
            return;
        }
        var clsl = shrink.className;
        var leftClass = clsl.match(regex);
        if(leftClass === null) {
            console.log("Shrink-container doesn't have a matching class.");
            return;
        }
        var widthRegex = new RegExp(mClass + '(\\d+)');
        var width = cls.match(widthRegex);
        var widthLeft = clsl.match(widthRegex);
        if(width === null || widthLeft === null) {
            console.log("Shouldn't happen ;)");
            return;
        }
        width = parseInt(width[1]);
        widthLeft = parseInt(widthLeft[1]);
        if(width == 12 || widthLeft === 0) {
            console.log("Container can not be shrinked/extended");
            return;
        }
        extend.classList.add(mClass+(width+1));
        extend.classList.remove(mClass+width);
        shrink.classList.add(mClass+(widthLeft-1));
        shrink.classList.remove(mClass+widthLeft);
        if(widthLeft === 1) { // hide container if it gets shrinked to 0
            shrink.classList.add('removed');
        }
        if(extend.className.indexOf('removed') > -1) { // show container if it is removed, but gets extended again
            extend.classList.remove('removed');
        }
    };

    var resizeableContainers = document.querySelectorAll('[resizeable]');
    var idxCtr = 0;

    return {
        restrict: 'A',
        scope: false,
        link: function(scope, element, attrs) {
            // scope.idxCtr = idxCtr;
            scope.clickLeft = function(i) {
                if(!i) return;
                var c = resizeableContainers[i-1];
                var cl = resizeableContainers[i];
                extendContainer(c, cl);
            };
            scope.clickRight = function(i) {
                if(i >= resizeableContainers.length-1) return;
                var c = resizeableContainers[i+1];
                var cl = resizeableContainers[i];
                extendContainer(c, cl);
            };
            scope.resizeToggle = scope.$eval(attrs.resizeable);
            if(idxCtr < resizeableContainers.length - 1) {
                var right = angular.element('<div class="resizeable-button-right" ng-if="resizeToggle" ng-click="clickRight('+idxCtr+')"><i class="material-icons">chevron_left</i></div>');
                element.prepend(right);
                $compile(right)(scope);
            }
            if(idxCtr !== 0) {
                var left = angular.element('<div class="resizeable-button-left" ng-if="resizeToggle" ng-click="clickLeft('+idxCtr+')"><i class="material-icons">chevron_right</i></div>');
                element.prepend(left);
                $compile(left)(scope);
            }
            idxCtr++;
            scope.$watch(function(scope) {
                return scope.$eval(attrs.resizeable);
            }, function(newVal, oldVal) {
                scope.resizeToggle = newVal;
            });
        }
    };
});

spacialistApp.directive('protectedSrc', ['httpGetFactory', function(httpGetFactory) {
    return {
        restrict: 'A',
        link: function(scope, element, attrs) {
            httpGetFactory(attrs.protectedSrc, function(response) {
                attrs.$set('src', response);
            });
        }
    };
}]);

spacialistApp.directive("number", function() {
    return {
        restrict: "A",
        require: "ngModel",
        link: function(scope, element, attributes, ngModel) {
            ngModel.$validators.number = function(modelValue) {
                return isFinite(modelValue);
            };
        }
    };
});

spacialistApp.filter('imageFilter', function(searchService) {
    var foundAll = function(haystack, needle) {
        if(!needle || needle.length === 0) return true;
        return needle.every(function(v) {
            return haystack.indexOf(v) >= 0;
        });
    };

    var foundSingle = function(haystack, needle) {
        if(!haystack || haystack.length === 0) return true;
        return haystack.indexOf(needle) > -1;
    };

    var matchesAllFilters = function(item, searchTerms) {
        if(!foundAll(item.tags, searchTerms.tags)) return false;
        if(!foundSingle(searchTerms.cameras, item.cameraname)) return false;
        if(!foundSingle(searchTerms.dates, searchService.formatUnixDate(item.created*1000))) return false;
        return true;
    };

    return function(items, searchTerms) {
        var filtered = [];
        for(var i=0; i<items.length; i++) {
            var item = items[i];
            if(matchesAllFilters(item, searchTerms)) {
                filtered.push(item);
            }
        }
        return filtered;
    };
});

spacialistApp.filter('urlify', function() {
    var urls = /(\b(https?|ftp):\/\/[A-Z0-9+&@#\/%?=~_|!:,.;-]*[-A-Z0-9+&@#\/%=~_|])/gim;
    return function(text) {
        if(text.match(urls)) {
            text = text.replace(urls, '<a href="$1" target="_blank">$1</a>');
        }
        return text;
    };
});

spacialistApp.filter('bytes', function() {
	return function(bytes, precision) {
        var units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
		if(isNaN(parseFloat(bytes)) || !isFinite(bytes)) return '0 ' + units[0];
		if(typeof precision === 'undefined') precision = 1;
		var number = Math.floor(Math.log(bytes) / Math.log(1024));
		return (bytes / Math.pow(1024, Math.floor(number))).toFixed(precision) +  ' ' + units[number];
	};
});

spacialistApp.filter('truncate', function () {
    return function (value, max, atword, suffix) {
        if(!value) return '';
        if(!max || value.length <= max) return value;

        value = value.substr(0, max);
        if(atword) {
            var lastWordIndex = value.lastIndexOf(' ');
            if(lastWordIndex != -1) {
                if(value.endsWith(',', lastWordIndex) || value.endsWith('.', lastWordIndex)) lastWordIndex--;
                value = value.substr(0, lastWordIndex);
            }
        }
        return value + (suffix || '…');
    };
});

spacialistApp.factory('httpPostPromise', function($http) {
    var getData = function(url, data) {
        return $http.post(url, data, {
            headers: {
                'Content-Type': undefined
            }
        }).then(function(result) {
            return result.data;
        });
    };
    return { getData: getData };
});

spacialistApp.factory('httpPostFactory', function($http) {
    return function(url, data, callback) {
        $http.post(url, data, {
            headers: {
                'Content-Type': undefined
            }
        }).success(function(response) {
            callback(response);
        });
    };
});

spacialistApp.factory('httpGetPromise', function($http) {
    var getData = function(url) {
        return $http.get(url, {
            headers: {
                'Content-Type': undefined
            }
        }).then(function(result) {
            return result.data;
        });
    };
    return { getData: getData };
});

spacialistApp.factory('httpGetFactory', function($http) {
    return function(url, callback) {
        $http.get(url, {
            headers: {
                'Content-Type': undefined
            }
        }).success(function(response) {
            callback(response);
        });
    };
});

spacialistApp.factory('httpDeleteFactory', function($http) {
    return function(url, callback) {
        $http.delete(url, {
            headers: {
                'Content-Type': undefined
            }
        }).success(function(response) {
            callback(response);
        });
    };
});

spacialistApp.factory('httpDeletePromise', function($http) {
    var getData = function(url) {
        return $http.delete(url, {
            headers: {
                'Content-Type': undefined
            }
        }).then(function(result) {
            return result.data;
        });
    };
    return { getData: getData };
});

spacialistApp.factory('httpPatchFactory', function($http) {
    return function(url, data, callback) {
        data.append('_method', 'PATCH');
        $http.post(url, data, {
            headers: {
                'Content-Type': undefined
            }
        }).success(function(response) {
            callback(response);
        });
    };
});

spacialistApp.factory('httpPatchPromise', function($http) {
    var getData = function(url, data) {
        data.append('_method', 'PATCH');
        return $http.post(url, data, {
            headers: {
                'Content-Type': undefined
            }
        }).then(function(result) {
            return result.data;
        });
    };
    return { getData: getData };
});

spacialistApp.factory('httpPutFactory', function($http) {
    return function(url, data, callback) {
        data.append('_method', 'PUT');
        $http.post(url, data, {
            headers: {
                'Content-Type': undefined
            }
        }).success(function(response) {
            callback(response);
        });
    };
});

spacialistApp.factory('httpPutPromise', function($http) {
    var getData = function(url, data) {
        data.append('_method', 'PUT');
        return $http.post(url, data, {
            headers: {
                'Content-Type': undefined
            }
        }).then(function(result) {
            return result.data;
        });
    };
    return { getData: getData };
});

spacialistApp.config(['markedProvider', function (markedProvider) {
  markedProvider.setOptions({
    gfm: true,
    tables: true,
    highlight: function (code, lang) {
      if (lang) {
        return hljs.highlight(lang, code, true).value;
      } else {
        return hljs.highlightAuto(code).value;
      }
    }
  });
  markedProvider.setRenderer({
    link: function(href, title, text) {
      return "<a href='" + href + "'" + (title ? " title='" + title + "'" : '') + " target='_blank'>" + text + "</a>";
    }
  });
}]);

spacialistApp.config(function($translateProvider) {
    $translateProvider.useStaticFilesLoader({
        files: [{
            prefix: 'l10n/',
            suffix: '.json'
        }, {
            prefix: 'l10n/project-',
            suffix: '.json'
        }]
    });
    $translateProvider.registerAvailableLanguageKeys(['en', 'de', 'fr', 'it', 'es'], {
        'de_DE': 'de',
        'de_AT': 'de',
        'de_CH': 'de',
        'en_UK': 'en',
        'en_US': 'en'
    });
    $translateProvider.determinePreferredLanguage();
    $translateProvider.useSanitizeValueStrategy('sce');
    $translateProvider.useLocalStorage();
});

spacialistApp.config(function($controllerProvider, $provide) {
    $provide.factory('moduleHelper', function() {
        return {
            controllerExists: function(name) {
                return $controllerProvider.has(name);
            }
        };
    });
});

spacialistApp.config(function($stateProvider, $urlRouterProvider, $authProvider, $httpProvider, $provide) {
    var lastError;
    var rejectReasons = [
        'user_not_found',
        'token_not_provided',
        'token_expired',
        'token_absent',
        'token_invalid'
    ];
    var rejectTranslationKeys = [
        "login.error.user-not-found",
        "login.error.token-not-provided",
        "login.error.token-expired",
        "login.error.token-absent",
        "login.error.token-invalid"
    ];

    function updateToken(response, $injector) {
        if(response.headers('Authorization') !== null) {
            var token = response.headers('Authorization').replace('Bearer ', '');
            var $auth = $injector.get('$auth');
            $auth.setToken(token);
            localStorage.setItem('satellizer_token', token);
        }
    }

    function setAuthHeader($q, $injector) {
        return {
            response: function(response) {
                updateToken(response, $injector);
                return response || $q.when(response);
            },
            responseError: function(rejection) {
                console.log("Something went wrong...");
                var userService = $injector.get('userService');
                var reasonIndex = rejectReasons.indexOf(rejection.data.error);
                if(rejection.data && reasonIndex > -1) {
                    localStorage.removeItem('user');
                    var userService = $injector.get('userService');
                    userService.loginError.message = rejectTranslationKeys[reasonIndex];
                } else if(rejection.status == 400 || rejection.status == 401) {
                    var $state = $injector.get('$state');
                    userService.loginError.message = 'login.error.400-or-401';
                    localStorage.removeItem('user');
                    var to = $state.router.stateService.$current.name;
                    var params = $state.router.stateService.$current.params;
                    $state.go('login', {toState: to, toParams: params});
                } else if(rejection.data.error) {
                    updateToken(rejection, $injector);
                    userService.loginError.errors = rejection.data.error;
                } else {
                    updateToken(rejection, $injector);
                    var parser = new DOMParser();
                    var doc = parser.parseFromString(rejection.data, "text/xml");
                    var errors = doc.getElementsByClassName('exception_message');
                    var modalFactory = $injector.get('modalFactory');
                    var errorMsg;
                    if(typeof errors[0] != 'undefined' && errors[0].innerHTML) {
                        errorMsg = errors[0].innerHTML;
                    } else {
                        errorMsg = rejection.statusText;
                    }
                    if(!lastError || lastError != rejection.status) {
                        lastError = rejection.status;
                        modalFactory.errorModal(errorMsg);
                    }
                }
                return $q.reject(rejection);
            }
        };
    }
    $provide.factory('setAuthHeader', setAuthHeader);

    $httpProvider.interceptors.push('setAuthHeader');

	$authProvider.baseUrl = '.';
    $authProvider.loginUrl = 'api/user/login';
    $urlRouterProvider.otherwise('/login');

    $stateProvider
        .state('login', {
                url: '/login',
                // templateUrl: 'layouts/login.html',
                params: {
                    toState: 'spacialist',
                    toParams: {}
                },
                views: {
                    header: {
                        component: 'header'
                    },
                    content: {
                        templateUrl: 'layouts/login.html',
                        controller: 'userCtrl'
                    }
                }
            })
        .state('root', {
            abstract: true,
            url: '',
            resolve: {
                user: function(userService) {
                    return userService.getUser();
                },
                config: function(userService, user) {
                    return {}; //TODO: return general config
                },
                userConfig: function(userService, user, config) {
                    return {
                        language: 'de'
                    }; //TODO: return active user's config
                },
                concepts: function(langService, userConfig) {
                    return langService.getConcepts(userConfig.language);
                },
                availableLanguages: function(langService) {
                    return langService.availableLanguages;
                }
            },
            views: {
                header: {
                    component: 'header'
                },
                content: {
                    component: 'root'
                }
            }
        })
            .state('root.spacialist', {
                url: '/s',
                component: 'spacialist',
                resolve: {
                    contexts: function(environmentService) {
                        return environmentService.getContexts();
                    },
                    user: function(user) {
                        // TODO other access to user object?
                        return user;
                    },
                    concepts: function(concepts) {
                        // TODO other access to concepts object?
                        return concepts;
                    },
                    map: function(mapService) {
                        return mapService.initMapVariables();
                    },
                    layer: function(map, mapService) {
                        return mapService.getLayers();
                    },
                    geodata: function(layer, mapService) {
                        return mapService.getGeodata();
                    }
                }
            })
                .state('root.spacialist.data', {
                    url: '/context/{id:[0-9]+}',
                    resolve: {
                        context: function(contexts, $transition$) {
                            var c = contexts.data[$transition$.params().id];
                            var lastmodified = c.updated_at || c.created_at;
                            var d = new Date(lastmodified);
                            c.lastmodified = d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
                            return c;
                        },
                        data: function(context, mainService) {
                            return mainService.getContextData(context.id);
                        },
                        fields: function(context, mainService) {
                            return mainService.getContextFields(context.context_type_id);
                        },
                        sources: function(context, literatureService) {
                            return literatureService.getByContext(context.id);
                        },
                        geodate: function(context, map) {
                            return map.geodata.linkedLayers[context.geodata_id];
                        },
                        user: function(user) {
                            // TODO other access to user object?
                            return user;
                        },
                        concepts: function(concepts) {
                            // TODO other access to concepts object?
                            return concepts;
                        }
                    },
                    onEnter: function(contexts, context, geodate, mainService) {
                        mainService.expandTree(contexts, context.id, true);
                        // TODO wait for init of geodata (mapService.initGeodata)
                        if(geodate) geodate.openPopup();
                    },
                    views: {
                        'context-detail': {
                            component: 'spacialistdata',
                        }
                    }
                })
                    .state('root.spacialist.data.sources', {
                        url: '/sources/{aid:[0-9]+}',
                        resolve: {
                            attribute: function(fields, $transition$) {
                                return fields.find(function(f) {
                                    return f.id == $transition$.params().aid;
                                });
                            },
                            certainty: function(data, $transition$) {
                                var aid = $transition$.params().aid;
                                return {
                                    certainty: data[aid+'_pos'] || 100,
                                    description: data[aid+'_desc'] || ''
                                };
                            },
                            attribute_sources: function(sources, $transition$) {
                                var aid = $transition$.params().aid;
                                return sources.filter(function(s) {
                                    return s.attribute_id == aid;
                                });
                            },
                            context: function(context) {
                                // TODO other access to context object?
                                return context;
                            },
                            literature: function(literatureService) {
                                return literatureService.getAll();
                            },
                            sources: function(sources) {
                                return sources;
                            }
                        },
                        onEnter: function($state, $uibModal, sources) {
                            $uibModal.open({
                                component: 'sourcemodal',
                                windowClass: 'wide-modal shrinked-modal',
                            }).result.finally(function() {
                                $state.go('^');
                            });
                        }
                    })
                .state('root.spacialist.add-top', {
                    url: '/add',
                    redirectTo: {
                        state: 'root.spacialist.add',
                        params: {
                            type: 'context',
                            id: 0
                        }
                    }
                })
                .state('root.spacialist.add', {
                    url: '/add/{id:[0-9]+}/{type}',
                    resolve: {
                        contextTypes: function(dataEditorService) {
                            return dataEditorService.getContextTypes();
                        }
                    },
                    onEnter: ['contexts', 'concepts', 'contextTypes', 'mainService', 'httpPostFactory', '$transition$', '$state', '$uibModal', function(contexts, concepts, contextTypes, mainService, httpPostFactory, $transition$, $state, $uibModal) {
                        $uibModal.open({
                            templateUrl: "modals/add-context.html",
                            controller: ['$scope', function($scope) {
                                $scope.contexts = contexts;
                                $scope.concepts = concepts;
                                $scope.type = $transition$.params().type;
                                $scope.parent = $transition$.params().id;

                                if($scope.type == 'context') {
                                    $scope.contextTypes = contextTypes.filter(function(t) {
                                        return t.type === 0;
                                    });
                                } else if($scope.type == 'find') {
                                    $scope.contextTypes = contextTypes.filter(function(t) {
                                        return t.type == 1;
                                    });
                                }
                                $scope.newContext = {
                                    name: '',
                                    type: ''
                                };
                                $scope.newContext.parent = $scope.parent > 0 ? $scope.parent : undefined;

                                $scope.cancel = function() {
                                    $scope.$dismiss();
                                    $state.go('^');
                                };

                                $scope.onAdd = function(c) {
                                    var formData = new FormData();
                                    formData.append('name', c.name);
                                    formData.append('context_type_id', c.type.id);
                                    if(c.parent) {
                                        formData.append('root_context_id', c.parent);
                                    }
                                    httpPostFactory('api/context', formData, function(response) {
                                        var newContext = response.context;
                                        mainService.addContextToTree(newContext, c.parent, contexts);
                                        $scope.$close(true);
                                        $state.go('root.spacialist.data', {id: newContext.id});
                                    });
                                };
                            }]
                        });
                    }]
                })
                .state('root.spacialist.data.delete', {
                    url: '/delete',
                    resolve: {
                        context: function(context) {
                            return context;
                        }
                    },
                    onEnter: ['contexts', 'context', 'concepts', 'mainService', 'snackbarService', '$transition$', '$state', '$uibModal', '$translate', function(contexts, context, concepts, mainService, snackbarService, $transition$, $state, $uibModal, $translate) {
                        $uibModal.open({
                            templateUrl: "modals/delete-context.html",
                            controller: ['$scope', function($scope) {
                                $scope.contexts = contexts;
                                $scope.concepts = concepts;
                                $scope.context = context;

                                $scope.cancel = function() {
                                    $scope.$dismiss();
                                    $state.go('^');
                                };

                                $scope.onDelete = function(context) {
                                    mainService.deleteContext(context, contexts).then(function() {
                                        var content = $translate.instant('snackbar.element-deleted.success', { name: context.name  });
                                        snackbarService.addAutocloseSnack(content, 'success');
                                        $scope.$close({state: 'success'});
                                        if(context.root_context_id){
                                            $state.go('root.spacialist.data', {id: context.root_context_id});
                                        } else {
                                            $state.go('root.spacialist');
                                        }
                                    });
                                };
                            }]
                        });
                    }]
                })
                .state('root.spacialist.geodata', {
                    url: '/geodata/{id:[0-9]+}',
                    resolve: {
                        context: function(contexts, geodate, map) {
                            var cid = map.geodata.linkedContexts[geodate.id];
                            var c;
                            if(cid) {
                                c = contexts.data[cid];
                                var lastmodified = c.updated_at || c.created_at;
                                var d = new Date(lastmodified);
                                c.lastmodified = d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
                            }
                            return c;
                        },
                        data: function(context, mainService) {
                            return mainService.getContextData(context.id);
                        },
                        fields: function(context, mainService) {
                            return mainService.getContextFields(context.context_type_id);
                        },
                        sources: function(context, mainService) {
                            // TODO
                            return [];
                        },
                        geodate: function(geodata, map, $transition$) {
                            var gid = geodata.find(function(g) {
                                return g.id == $transition$.params().id;
                            });
                            // TODO wait for init of geodata (mapService.initGeodata)
                            return map.geodata.linkedLayers[gid];
                        },
                        user: function(user) {
                            // TODO other access to user object?
                            return user;
                        },
                        concepts: function(concepts) {
                            // TODO other access to concepts object?
                            return concepts;
                        }
                    },
                    onEnter: function(geodate) {
                        // TODO wait for init of geodata (mapService.initGeodata)
                        if(geodate) geodate.openPopup();
                    },
                    views: {
                        'context-detail': {
                            component: 'spacialistdata'
                        }
                    }
                })
            .state('root.user', {
                url: '/user',
                component: 'user',
                resolve: {
                    user: function(user) {
                        // TODO other access to user object?
                        return user;
                    },
                    users: function(userService) {
                        return userService.getUsers();
                    },
                    roles: function(userService) {
                        return userService.getRoles();
                    },
                    rolesPerUser: function(users, userService) {
                        for(var i=0; i<users.length; i++) {
                            userService.getUserRoles(users[i]);
                        }
                    }
                }
            })
                .state('root.user.edit', {
                    url: '/edit/{id:[0-9]+}',
                    resolve: {
                        user: function(user) {
                            // TODO other access to user object?
                            return user;
                        },
                        selectedUser: function(users, $transition$) {
                            return users.find(function(u) {
                                return u.id == $transition$.params().id;
                            });
                        }
                    },
                    onEnter: ['selectedUser', '$state', '$uibModal', function(selectedUser, $state, $uibModal) {
                        $uibModal.open({
                            templateUrl: "modals/edit-user.html",
                            controller: ['$scope', 'userService', function($scope, userService) {
                                var orgUser = selectedUser;
                                $scope.editUser = angular.copy(orgUser);

                                $scope.cancel = function() {
                                    $scope.$dismiss();
                                };

                                $scope.onEdit = function(editUser) {
                                    userService.editUser(orgUser, editUser).then(function() {
                                        $scope.$close(true);
                                    });
                                };
                            }]
                        }).result.finally(function() {
                            $state.go('^');
                        });
                    }]
                })
            .state('root.role', {
                url: '/role',
                component: 'role',
                resolve: {
                    roles: function(userService) {
                        return userService.getRoles();
                    },
                    permissions: function(userService) {
                        return userService.getPermissions();
                    },
                    permissionsPerRole: function(roles, userService) {
                        for(var i=0; i<roles.length; i++) {
                            userService.getRolePermissions(roles[i]);
                        }
                    },
                    user: function(user) {
                        // TODO other access to user object?
                        return user;
                    }
                }
            })
                .state('root.role.edit', {
                    url: '/edit/{id:[0-9]+}',
                    resolve: {
                        user: function(user) {
                            // TODO other access to user object?
                            return user;
                        },
                        role: function(roles, $transition$) {
                            // TODO open modal
                            return roles.find(function(r) {
                                return r.id == $transition$.params().id;
                            });
                        }
                    },
                    onEnter: ['role', '$state', '$uibModal', function(role, $state, $uibModal) {
                        $uibModal.open({
                            templateUrl: "modals/edit-role.html",
                            controller: ['$scope', 'userService', function($scope, userService) {
                                var orgRole = role;
                                $scope.editRole = angular.copy(orgRole);

                                $scope.cancel = function() {
                                    $scope.$dismiss();
                                };

                                $scope.onEdit = function(editRole) {
                                    userService.editRole(orgRole, editRole).then(function() {
                                        $scope.$close(true);
                                    });
                                };
                            }]
                        }).result.finally(function() {
                            $state.go('^');
                        });
                    }]
                })
            .state('root.bibliography', {
                url: '/bibliography',
                component: 'bibliography',
                resolve: {
                    bibliography: function(literatureService) {
                        return literatureService.getAll();
                    },
                    user: function(user) {
                        // TODO other access to user object?
                        return user;
                    }
                }
            })
                .state('root.bibliography.edit', {
                    url: '/edit/{id:[0-9]+}',
                    resolve: {
                        entry: function(bibliography, $transition$) {
                            // TODO open modal
                            return bibliography.find(function (entry) {
                                return entry.id == $transition$.params().id;
                            });
                        },
                        types: function(literatureService) {
                            return literatureService.getTypes();
                        }
                    },
                    onEnter: ['entry', 'types', '$state', '$uibModal', function(entry, types, $state, $uibModal) {
                        $uibModal.open({
                            templateUrl: "modals/edit-bibliography.html",
                            controller: ['$scope', 'literatureService', function($scope, literatureService) {
                                $scope.editEntry = angular.copy(entry);
                                $scope.type = {
                                    selected: types.find(function(t) {
                                        return t.name == $scope.editEntry.type;
                                    })
                                };
                                delete $scope.editEntry.type;
                                $scope.types = types;

                                $scope.cancel = function() {
                                    $scope.$dismiss();
                                };

                                $scope.onEdit = function(editEntry, selectedType) {
                                    literatureService.editLiterature(editEntry, selectedType).then(function(response) {
                                        for(var k in response) {
                                            if(response.hasOwnProperty(k)) {
                                                entry[k] = response[k];
                                            }
                                        }
                                        $scope.$close(true);
                                    });
                                };
                            }]
                        }).result.finally(function() {
                            $state.go('^');
                        });
                    }]
                })
            .state('root.editor', {
                abstract: true,
                url: '/editor'
            })
                .state('root.editor.data-model', {
                    url: '/data-model',
                    component: 'datamodel',
                    resolve: {
                        attributes: function(dataEditorService) {
                            return dataEditorService.getAttributes();
                        },
                        attributetypes: function(dataEditorService) {
                            return dataEditorService.getAttributeTypes();
                        },
                        concepts: function(concepts) {
                            // TODO other access to concepts object?
                            return concepts;
                        },
                        contextTypes: function(dataEditorService) {
                            return dataEditorService.getContextTypes();
                        },
                        geometryTypes: function(dataEditorService) {
                            return dataEditorService.getGeometryTypes();
                        }
                    }
                })
                    .state('root.editor.data-model.edit', {
                        url: '/contexttype/{id:[0-9]+}',
                        component: 'contexttypeedit',
                        resolve: {
                            contextType: function(contextTypes, $transition$) {
                                return contextTypes.find(function(ct) {
                                    return ct.id == $transition$.params().id;
                                });
                            },
                            attributes: function(attributes) {
                                // TODO other access to attributes object?
                                return attributes;
                            },
                            concepts: function(concepts) {
                                // TODO other access to concepts object?
                                return concepts;
                            },
                            fields: function(contextType, mainService) {
                                return mainService.getContextFields(contextType.id);
                            }
                        }
                    })
                .state('root.editor.layer', {
                    url: '/layer',
                    component: 'layer',
                    resolve: {
                        avLayers: function(mapService) {
                            return mapService.getLayers();
                        },
                        concepts: function(concepts) {
                            // TODO other access to concepts object?
                            return concepts;
                        }
                    }
                })
                    .state('root.editor.layer.edit', {
                        url: '/layer/{id:[0-9]+}',
                        component: 'layeredit',
                        resolve: {
                            layer: function(avLayers, $transition$) {
                                return avLayers.find(function(l) {
                                    return l.id == $transition$.params().id;
                                });
                            },
                            concepts: function(concepts) {
                                // TODO other access to concepts object?
                                return concepts;
                            }
                        }
                    });
});

/**
 * Redirect user to 'spacialist' state if they are already logged in and access the 'auth' state
 */
spacialistApp.run(function($state, mapService, userService, $transitions) {
    $transitions.onStart({}, function(trans) {
        var user = localStorage.getItem('user');
        // var authenticated = false;
        if(user !== '') {
            parsedUser = JSON.parse(user);
            if(parsedUser) {
                // authenticated = true;
                userService.currentUser.user = parsedUser.user;
                userService.currentUser.permissions = parsedUser.permissions;
                if(!userService.can('duplicate_edit_concepts')) {
                    if(typeof mapService.map != 'undefined') {
                        mapService.map.drawOptions.draw = {
                            polyline: false,
                            polygon: false,
                            rectangle: false,
                            circle: false,
                            marker: false
                        };
                    }
                }
                if (trans.to().name == 'login') {
                    return trans.router.stateService.target('root.spacialist');
                }
            }
        }
        // if(!autheticated) {
        //     return trans.router.stateService.target('login');
        // }
    });
});
