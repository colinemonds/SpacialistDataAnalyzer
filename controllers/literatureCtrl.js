spacialistApp.controller('literatureCtrl', function($scope, literatureService, userService, modalFactory, httpGetFactory, httpPostFactory) {
    $scope.can = userService.can;
    $scope.literature = literatureService.literature;
    $scope.currentUser = userService.currentUser;

    $scope.sortType = 'author';
    $scope.sortReverse = false;
    $scope.searchTerm = '';

    $scope.deleteLiteratureEntry = function(id, index) {
        literatureService.deleteLiteratureEntry(id, index);
    };

    $scope.editLiteratureEntry = function(id, index) {
        literatureService.editLiteratureEntry(id, index);
    };

    $scope.openAddLiteratureDialog = function() {
        literatureService.openAddLiteratureDialog();
    };
});
