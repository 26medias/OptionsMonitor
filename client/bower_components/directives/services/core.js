window.appSettings.module.service('core', [function() {
    var scope = this;

    this.itvs = {};
    this.timers = {};

    // Trigger a timer group
    this.trigger = function(t) {
        _.each(scope.timers[t], function(cb) {
            cb();
        });
    };

    // Cancel a timer by id
    this.cancel = function(t, id) {
        delete scope.timers[t][id];
        if (_.keys(scope.timers[t]).length==0) {
            clearInterval(scope.itvs[t]);
            delete scope.timers[t];
            delete scope.itvs[t];
        }
    };

    // Add a timer
    this.timer = function(t, cb) {
        if (!scope.timers[t]) {
            scope.timers[t] = {};
            scope.itvs[t] = setInterval(function() {
                scope.trigger(t);
            }, t);
        }
        var id = window.ftl.sid();
        scope.timers[t][id] = cb;
        return {
            id: id,
            remove: function() {
                scope.cancel(t, id);
            }
        };
    };
}]);
