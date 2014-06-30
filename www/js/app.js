
var api_endpoint = 'https://localhost/rest';
var username = "mobile";
var password = "ulan";

var app = angular.module('beat', ['ionic', 'ngResource']);

app.config(function($httpProvider, $stateProvider, $urlRouterProvider) {
	
	$urlRouterProvider.otherwise('/');
	
	$stateProvider
	
		.state('/', {
			url : '/',
			templateUrl : 'partials/services.html',
			controller : 'servicesCtrl'
		})
		
		.state('/branches', {
			url : '/branches/{serviceId}',
			templateUrl : 'partials/branches.html',
			controller : 'branchesCtrl'
		})
		
		.state('/branches/branch', {
			url : '/branches/{serviceId}/{branchId}',
			templateUrl : 'partials/branch.html',
			controller : 'branchCtrl'
		})
		
		.state('/ticket', {
			url : '/ticket/{serviceId}/{branchId}/{visitId}/{ticketId}',
			templateUrl : 'partials/ticket.html',
			controller : 'ticketCtrl'
		});
	
	function encodeBase64(input) {
        var keyStr = 'ABCDEFGHIJKLMNOP' +
            'QRSTUVWXYZabcdef' +
            'ghijklmnopqrstuv' +
            'wxyz0123456789+/' +
            '=';
        
        var output = '';
        var chr1, chr2, chr3 = '';
        var enc1, enc2, enc3, enc4 = '';
        var i = 0;

        do {
            chr1 = input.charCodeAt(i++);
            chr2 = input.charCodeAt(i++);
            chr3 = input.charCodeAt(i++);

            enc1 = chr1 >> 2;
            enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
            enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
            enc4 = chr3 & 63;

            if (isNaN(chr2)) {
                enc3 = enc4 = 64;
            } else if (isNaN(chr3)) {
                enc4 = 64;
            }

            output = output +
                keyStr.charAt(enc1) +
                keyStr.charAt(enc2) +
                keyStr.charAt(enc3) +
                keyStr.charAt(enc4);
            chr1 = chr2 = chr3 = '';
            enc1 = enc2 = enc3 = enc4 = '';
        } while (i < input.length);

        return output;
    }
	
	$httpProvider.defaults.headers.common['Authorization'] = 'Basic ' + encodeBase64(username + ':' + password);
});

app.run(function($ionicPlatform) {
  $ionicPlatform.ready(function() {
    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs)
    if(window.cordova && window.cordova.plugins.Keyboard) {
      	cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
    }
    if(window.StatusBar) {
     	 StatusBar.styleDefault();
    }
  });
});

app.factory('Geo', function($q) {
	return {
		getLocation: function() {
	    	var q = $q.defer();

	      	navigator.geolocation.getCurrentPosition(function(position) {
	        	q.resolve(position);
	      	}, function(error) {
	        	q.reject(error);
	      	});

	      	return q.promise;
	    }
	};
});

app.controller('servicesCtrl', function($scope, $http) {
	$scope.services = [];
	
	$scope.getServices = function() {
		$scope.services = [];
		$http.get(api_endpoint + '/services')
			.success(function(data) {
				$scope.services = data;
			})
			.error(function(data, status) {
				console.log(data);
			})
			.finally(function() {
				// Stop the ion-refresher from spinning
				$scope.$broadcast('scroll.refreshComplete');
			});
	};
	
	$scope.getServices();
});

app.controller('branchesCtrl', function($scope, $stateParams, $http, Geo) {
	$scope.branches = [];
	$scope.serviceId = $stateParams.serviceId;
	
	$scope.getBranches = function() {
		$scope.branches = [];
		Geo.getLocation().then(function(geolocation) {
			console.log(geolocation);
			var longitude = geolocation.coords.longitude;
			var latitude = geolocation.coords.latitude;
			
			$http.get(api_endpoint + '/services/' + $scope.serviceId + '/branches?longitude=' + longitude + '&latitude=' + latitude + '&radius=999999999')
				.success(function(data) {
					$scope.branches = data;
				})
				.error(function(data, status) {
					console.log(data);
				});
		});
	};
	
	$scope.getBranches();
});

app.controller('branchCtrl', function($scope, $stateParams, $http, $state) {
	$scope.branch = {};
	$scope.serviceId = $stateParams.serviceId;
	$scope.branchId = $stateParams.branchId;
	
	$scope.getBranch = function() {
		$scope.branch = {};
		$http.get(api_endpoint + '/services/' + $scope.serviceId + '/branches/' + $scope.branchId)
			.success(function(data) {
				$scope.branch = data;
			})
			.error(function(data, status) {
				console.log(data);
			})
			.finally(function() {
				// Stop the ion-refresher from spinning
				$scope.$broadcast('scroll.refreshComplete');
			});
	};
	
	$scope.getTicket = function() {
		$http.post(api_endpoint + '/services/' + $scope.serviceId + '/branches/' + $scope.branchId + '/ticket/issue')
			.success(function(data) {
				$state.go('/ticket', {
					serviceId: data.serviceId,
					branchId: data.branchId,
					visitId: data.visitId,
					ticketId: data.ticketNumber
				});
			})
			.error(function(data, status) {
				console.log(data);
			});
	}
	
	$scope.getBranch();
});

app.controller('ticketCtrl', function($scope, $state, $stateParams, $http, $ionicNavBarDelegate, $ionicActionSheet, $timeout) {
	$scope.ticket = $stateParams.ticketId;
	$scope.serviceId = $stateParams.serviceId;
	$scope.branchId = $stateParams.branchId;
	$scope.visitId = $stateParams.visitId;
	
	$ionicNavBarDelegate.showBackButton(false); // doesn't seem to work...
	
	$scope.deleteTicket = function() {
		var actionSheet = $ionicActionSheet.show({
			titleText: 'Are you sure you want to delete this ticket?',
			cancelText: 'Cancel',
			destructiveText: 'Delete',
			cancel: function() {
				return true;
			},
			destructiveButtonClicked: function() {
				$http.post(api_endpoint + '/services/' + $scope.serviceId + '/branches/' + $scope.branchId + '/ticket/' + $scope.visitId + '/dispose')
					.success(function() {
						$state.go('/');
					})
					.error(function(data, status) {
						console.log(data);
						return false;
					});
			}
		});
		
		$timeout(function() {
			actionSheet();
		}, 10 * 1000);
	}
});
