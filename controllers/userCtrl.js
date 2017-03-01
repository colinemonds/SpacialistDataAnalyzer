spacialistApp.controller('userCtrl', ['$scope', 'userService', 'analysisService', '$state', 'modalFactory', function($scope, userService, analysisService, $state, modalFactory) {
    $scope.currentUser = userService.currentUser;
    $scope.users = userService.users;
    $scope.roles = userService.roles;
    $scope.loginError = userService.loginError;
    $scope.analysisEntries = analysisService.entries;
    $scope.setAnalysisEntry = analysisService.setAnalysisEntry;

    $scope.openStartPage = function() {
        analysisService.unsetAnalysisEntry();
        $state.go('spacialist');
    };

    $scope.loginUser = function(email, password) {
        var credentials = {
            email: email,
            password: password
        };
        userService.loginUser(credentials);
    };

    $scope.guestLogin = function() {
        var email = 'udontneedtoseehisidentification@rebels.tld';
        var pw = 'thesearentthedroidsuarelookingfor';
        $scope.loginUser(email, pw);
    };

    $scope.logoutUser = function() {
        userService.logoutUser();
    };

    $scope.openUserManagement = function() {
        $state.go('user', {});
    };

    $scope.openLiteratureView = function() {
        $state.go('literature', {});
    };

    $scope.getUserList = function() {
        userService.getUserList();
    };

    $scope.getRoles = function() {
        userService.getRoles();
    };

    $scope.getUserRoles = function(id, $index) {
        userService.getUserRoles(id, $index);
    };

    $scope.addUserRole = function($item, user_id) {
        userService.addUserRole($item, user_id);
    };

    $scope.removeUserRole = function($item, user_id) {
        userService.removeUserRole($item, user_id);
    };

    $scope.openAddUserDialog = function() {
        modalFactory.addUserModal(userService.addUser);
    };

    $scope.openEditUserDialog = function(user, $index) {
        var values = {
            id: user.id,
            name: user.name,
            email: user.email,
            password: ''
        };
        modalFactory.editUserModal(userService.editUser, values, $index);
    };
}]);
