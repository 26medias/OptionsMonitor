window.appSettings.module.service('db', [function() {
	//https://github.com/knadh/localStorageDB

    var scope = this;

    this.cols = {
        tokens: ["address", "created", "name", "symbol", "decimals", "liquidity", "lockLiquidityUntil", "owner", "tradingStartTime"],
        states: ["name", "value"]
    }

	this.open = function(name) {
        //console.log("[db] opening", name);
        var lib = new localStorageDB(name, localStorage);
        if(lib.isNew()) {
            //console.log("[db:new]", name);
            switch (name) {
                case "tokens":
                    lib.createTable(name, scope.cols[name]);
                    lib.commit();
                break;
                case "states":
                    lib.createTable(name, scope.cols[name]);
                    lib.commit();
                break;
            }
        }
        return lib;
	}

    this.filter = function(name, data) {
        var newData = {};
        _.each(data, function(v, k) {
            if (_.contains(scope.cols[name], k)) {
                newData[k] = v;
            }
        });
        return newData;
    }

    this.setState = function(name, value) {
        var dbStates = scope.open('states');
        dbStates.insertOrUpdate('states', {name: name}, {
            name:   name,
            value:  value
        });
        dbStates.commit();
        return true;
    }
    this.getState = function(name) {
        var dbStates = scope.open('states');
        var state = dbStates.queryAll("states", {
            query: {name: name}
        });
        if (state && state.length>0) {
            return state[0].value;
        }
        return null;
    }
}]);
