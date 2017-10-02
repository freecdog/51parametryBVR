/**
 * Created by jaric on 15.06.2017.
 */

(function (angular){

    "use strict";

    console.log("angular is here:", angular);

    var jCalcBVRApp = angular.module('jCalcBVRApp', [
        'ui.bootstrap',
        'jCalcBVRControllers'
    ]);
    console.log("jCalcBVRApp", jCalcBVRApp);

})(angular);