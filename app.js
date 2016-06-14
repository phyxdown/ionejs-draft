(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
ionejs = require('ionejs');
stage = new ionejs.ones.Stage({
    id: 'app',
    fillStyle: 'rgba(244, 244, 244, 1)',
    hitable: true,
    debug: true,
    fpslimit: 60
});

stage.addEventListener('click', function() {console.log(1)});

},{"ionejs":17}],2:[function(require,module,exports){
var Action = function(one) {
    this.one = one;
};

var p = Action.prototype;

p.afterCreate = function() {};
p.beforeMount = function() {};
p.afterMount = function() {};
p.beforeUnmount = function() {};
p.afterUnmount = function() {};

p.update = function() {};
module.exports = Action;

},{}],3:[function(require,module,exports){
var _ = require('underscore');
var Event = function(options) {

    this.type = options.type;
    this.data = _.omit(options, 'type');

    this.target = null;

    this.currentTarget = null;

    this.phase = null;

    this._immediatePropagationStopped = false;
    this._propagationStopped = false;
};

Event.CAPTURING_PHASE = 1;
Event.AT_TARGET = 2;
Event.BUBBLING_PHASE = 3;

var p = Event.prototype;

p.isPropagationStopped = function() {
    return this._propagationStopped;
};

p.stopImmediatePropagation = function() {
    this._immediatePropagationStopped = true;
    this._propagationStopped = true;
};

p.stopPropagation = function() {
    this._propagationStopped = true;
};

module.exports = Event;

},{"underscore":20}],4:[function(require,module,exports){
var Matrix2D = require("../geom/Matrix2D");
var Point = require("../geom/Point");
var inherits = require("../utils/inherits")

var Matrix = function() {
    if (arguments.length == 6) {
        Matrix2D.apply(this, arguments);
    } else if (arguments.length == 1) {
        Matrix2D.apply(this, []);
        this.transform(arguments[0]);
    } else if (arguments.length == 0) {
        Matrix2D.apply(this, []);
    } else
        throw new Error("Illegal params for core.Matrix.");
}

var p = inherits(Matrix, Matrix2D);

p.transform = function(state) {
    var x = state.x,
        y = state.y,
        scaleX = state.scaleX,
        scaleY = state.scaleY,
        rotation = state.rotation,
        skewX = state.skewX,
        skewY = state.skewY,
        regX = state.regX,
        regY = state.regY;

    rotation *= Math.PI / 180;
    skewX *= Math.PI / 180;
    skewY *= Math.PI / 180;
    var cos = Math.cos,
        sin = Math.sin;
    this.prepend(1, 0, 0, 1, regX, regY);
    this.prepend(scaleX, 0, 0, scaleY, 0, 0);
    this.prepend(cos(rotation), sin(rotation), -sin(rotation), cos(rotation), 0, 0);
    this.prepend(cos(skewY), sin(skewY), -sin(skewX), cos(skewX), 0, 0);
    this.prepend(1, 0, 0, 1, x, y);
    return this;
}

p.translate = function() {};

p.rotate = function() {};

p.skew = function() {};

p.scale = function() {};

module.exports = Matrix;

},{"../geom/Matrix2D":13,"../geom/Point":14,"../utils/inherits":19}],5:[function(require,module,exports){
var Point = require('../geom/Point');
var Matrix = require('./Matrix');
var Event = require("./Event");
var _ = require("underscore");

var defaultState = {
    active: true,
    visible: true,
    hitable: false,
    moveable: false,
    dropable: false,
    x: 0,
    y: 0,
    regX: 0,
    regY: 0,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    skewX: 0,
    skewY: 0,
    alpha: 1
};

/**
 * What is one?
 * I mean oberservable nested existing.
 * eh..
 * That is a pity.
 */
var One = function(options, groupOptions) {
    /**
     * Param check is expected.
     * The code line below is temporary.
     */
    options = options || {};
    this.state = _.defaults(options, defaultState);

    var listeners = {};
    listeners["bubble"] = {};
    listeners["capture"] = {};

    this._listeners = listeners;

    this._id = options.id || null;
    /**
     * Duplicated names and anonymity are both permitted.
     * But this._name can't be changed after this is constructed.
     * Basically, no properties with _ prefixed can be accessed directly.
     * @option {string} name
     */
    this._name = options.name || null;
    this._group = options.group || null;
    if(this._group)
        this.groupState = groupOptions || {};

    this._mounted = false;

    this._parent = null;
    this._leader = null;

    this._actions = [];
    this._childMap = {};
    this._children = [];

    this._alias = 'ionejs.One';
    this._error = false;

	this.afterCreate && this.afterCreate(options, groupOptions);
};

var p = One.prototype;

p._mapChild = function(one) {
    if (one._name) {
        var name = one._name;
        var map = this._childMap;
        if (!map[name]) {
            map[name] = [one];
        } else {
            map[name].unshift(one);
        }
    }
};

p._unmapChild = function(one) {
    if (one._name) {
        var name = one._name;
        var map = this._childMap;
        if (!map[name]) return;
        else if (map[name].length == 1) delete map[name];
        else {
            for (var i = 0, l = map[name].length; i < l; i++) {
                if (map[name][i] === one) map[name].splice(i, 1);
            }
        }
    }
};

/**
 * Add one at the end of the child list(_children), as the tail or the top.
 * In rendering phase, the tail of the child list will be rendered over any other ones in same list.
 * @param {core.One} one
 */
p.addChild = function(one) {
    if(this._mounted) one._beforeMount();
    one.setParent(this);
    this._children.push(one);
    this._mapChild(one);
    if(this._mounted) one._afterMount();
};

/**
 * Insert one into the child list(_children) according to the index.
 * If index exceeds the length of the child list, one will be added as the tail.
 * @param  {core.One} one
 * @param  {number} index
 */
p.insertChild = function(one, index) {
    if(this._mounted) one._beforeMount();
    one.setParent(this);
    this._children.splice(index, 0, one);
    this._mapChild(one);
    if(this._mounted)one._afterMount();
};

/**
 * Remove one from the child list(_children)
 * If the one is not in the child list, removing will not make sense.
 * As this process needs iteration, meaningless removing causes considerable performance demerit.
 * @param  {core.One} one
 */
p.removeChild = function(one) {
    one._beforeUnmount();
    var children = this._children;
    for (var i = 0, l = children.length; i < l; i++) {
        if (children[i] === one) {
            one.setParent(null);
            children.splice(i, 1);
            this._unmapChild(one);
        }
    }
    one._afterUnmount();
};

/**
 * Remove one from the child list(_children) by index
 * If index is larger than _children.length, removing will not make sense.
 * @param  {core.One} one
 */
p.removeChildByIndex = function(i) {
    var children = this._children;
    if (children.length <= i) return;
    var child = children[i];
    child._beforeUnmount();
    child.setParent(null);
    children.splice(i, 1);
    this._unmapChild(child);
    child._afterUnmount();
};

/**
 * Remove all children
 */
p.removeAllChildren = function() {
    for (var i = 0, l = children.length; i < l; i++) children[i]._beforeUnmount();
    this._childMap = {};
    this._children = [];
    for (var i = 0, l = children.length; i < l; i++) children[i]._afterUnmount();
};


/**
 * Add Actions
 * @param  {array} or {object} Actions
 */
p.addActions = function(actions) {
    for(var i in actions) {
        this.addAction(actions[i]);
	}
};

/**
 * Add Action
 * @param  {function} Action
 */
p.addAction = function(Action) {
    if (typeof Action == 'function') {
        var action = new Action(this);
        if (action instanceof Action) {
            this._actions.push(action);
            action.afterCreate();
        }
    }
};

/**
 * Get children.
 * @return {Array} children
 */
p.getChildren = function() {
    return this._children;
};

/**
 * Get name.
 * @return {string} name
 */
p.getName = function() {
    return this._name;
};

/**
 * Get id.
 * @return {string} id
 */
p.getId = function() {
    return this._id;
};

p.getLeader = function() {
    if (this._leader) return this._leader;
    else {
        var group;
        var leader = this.getParent();
        if(!leader) return null;
        while(!(group = leader._group)) {
            leader = leader.getParent();
            if (!leader) break;
        }
        this._leader = leader;
        return leader;
    }
};

/**
 * Get group.
 * @return {string} group
 */
p.getGroup = function() {
    return this.getLeader()._group;
};

/**
 * Get groupState.
 * @return {Object} groupState
 */
p.getGroupState = function() {
    return this.getLeader()._groupState;
};

/**
 * Get index.
 * @return {string} index
 */
p.getIndex = function() {
    var I = this;
    return this.getParent().getChildren().findIndex(function(child) {
        return I == child;
    });
};


/**
 * Return a name based path
 * @param {string} separator eg. "."
 * @return {string}
 */
p.getPath = function(separator) {
    try {
        var parents = this.getAncestors().reverse();
        var names = parents.map(function(parent) {
                return parent._name;
        });
        var separator = separator || ".";
        return names.join(separator)
    } catch (e) {
        return "";
    }
};

/**
 * Name based query
 * @param  {string} path      eg. "pricess.leg.skin"
 * @param  {string} separator eg. "."
 * @return {core.One}
 */
p.query = function(path, separator) {
    try {
        var separator = separator || ".";
        var names = path.split(separator);
        var _query = function(one, names) {
            if (names.length > 1) {
                return _query(one._childMap[names.shift()][0], names);
            } else
                return one._childMap[names.shift()][0];
        }
        return _query(this, names) || null;
    } catch (e) {
        return null;
    }
};

/**
 * Get parent.
 * @return {core.One} parent
 */
p.getParent = function() {
    return this._parent;
};

/**
 * Set parent.
 * @param {core.One} parent
 */
p.setParent = function(one) {
    this._parent = one;
};

/**
 * Get stage.
 * The methed assumes that stage is the root of display hierachy.
 * @return {one.Stage}
 */
p.getStage = function() {
    var arr = [];
    var cur = this;
    while (cur._parent) {
        cur = cur._parent;
    }
    return cur;
};

/**
 * Get ancestors.
 * Please read source code if you don't understand what ancestors are.
 * It's not long.
 * @return {Array}
 */
p.getAncestors = function() {
    var arr = [];
    var cur = this;
    while (cur._parent) {
        cur = cur._parent;
        arr.push(cur);
    }
    return arr;
};

/**
 * Add event listener.
 * Duplicated adding would be ignored.
 * @param {string} type
 * @param {function} listener
 * @param {boolean} useCapture
 * @return {function} listener
 */
p.on = p.addEventListener = function(type, listener, useCapture) {
    var phase = useCapture ? "capture" : "bubble";
    var arr = this._listeners[phase][type];
    for (var i = 0, l = arr ? arr.length : 0; i < l; i++) {
        if (arr[i] === listener)
            return;
    }
    if (!arr)
        this._listeners[phase][type] = [listener];
    else
        arr.push(listener);
    return listener;
};

/**
 * Remove event listener.
 * @param  {string} type
 * @param  {function} listener
 * @param  {boolean} useCapture
 */
p.off = p.removeEventListener = function(type, listener, useCapture) {
    var phase = useCapture ? "capture" : "bubble";
    var arr = this._listeners[phase][type];
    for (var i = 0, l = arr ? arr.length : 0; i < l; i++) {
        if (arr[i] === listener) {
            if (l == 1)
                delete(this._listeners[phase][type]);
            else
                arr.splice(i, 1);
            break;
        }
    }
};

/**
 * Fire event.
 * Event dispatching in ionejs has three phases, which is similar to DOM.
 * Capture --> Target --> Bubble
 * See {core.Event} for more information.
 * @param  {core.Event} event
 */
p.dispatchEvent = function(event) {
    event.target = this;

    var arr = this.getAncestors();

    event.phase = Event.CAPTURING_PHASE;
    for (var i = arr.length - 1; i >= 0; i--) {
        arr[i]._dispatchEvent(event);
        if (event._propagationStopped) return;
    }

    event.phase = Event.AT_TARGET;
    this._dispatchEvent(event);
    if (event._propagationStopped) return;

    event.phase = Event.BUBBLING_PHASE;
    for (var i = 0, len = arr.length; i < len; i++) {
        arr[i]._dispatchEvent(event);
        if (event._propagationStopped) return;
    }
};

p._dispatchEvent = function(event) {
    event.currentTarget = this;
    var phase, arr;
    /**
     * The code below is ambiguous, explicit logic may be expected.
     */
    try {
        phase = event.phase === Event.CAPTURING_PHASE ? "capture" : "bubble";
        arr = this._listeners[phase][event.type].slice();
    } catch (e) {
        //Some events are listened.
        return;
    }

    for (var i = 0, len = arr.length; i < len; i++) {
        try {
            arr[i](event);
            if (event._immediatePropagationStopped) break;
        } catch (e) {
            console.log(e, this._alias, arr[i], event);
        }
    }

};

p.overlay = function(one, keys) {
    var keys = keys || ["x", "y", "scaleX", "scaleY", "rotation", "skewX", "skewY", "regX", "regY", "alpha"];
    var me = this;
    keys.forEach(function(key, i) {
        me.state[key] = one.state[key];
    });
};

p.getAbsoluteMatrix = function() {
    var ancestors = this.getAncestors();
    var m = new Matrix();
    m.transform(this.state);
    for (var i = 0, l = ancestors.length; i < l; i++) {
        m.transform(ancestors[i].state);
    }
    return m;
};

/**
 * convert global coordinates to local
 * @param  {geom.Point} point
 * @return {geom.Point}
 */
p.globalToLocal = function(point) {
    return point.clone().retransform(this.getAbsoluteMatrix());
};

/**
 * convert local coordinates to global
 * @param  {geom.Point} point
 * @return {geom.Point}
 */
p.localToGlobal = function(point) {
    return point.clone().transform(this.getAbsoluteMatrix());
};

/**
 * Get one from descendants that seems to intersect the local coordinates,
 * which means this one is rendered over other intersected ones.
 * Please read source code if you don't understand what descendants are.
 * It's not long.
 * @param  {geom.Point} point
 * @return {core.Object}
 */
p.hit = function(point) {
    var children = this._children;
    for (var i = children.length - 1; i > -1; i--) {
        var descendant = children[i].hit(point);
        if (descendant) return descendant;
    }
    if (this.state.hitable) {
        if (this.testHit(this.globalToLocal(point))) return this;
    }
    return null;
};

/**
 * testHit is useful when overrided, to test whether this one intersects the hit point.
 * When _hitable is set to false, testHit does not work.
 * @param  {geom.Point} point
 * @return {boolean}
 */
p.testHit = function(point) {
    return false;
};

p._beforeMount = function() {
    var I = this, actions = I._actions;
    I.beforeMount();
    actions.forEach(function(action) {
        action.beforeMount();
    });
    this._children.forEach(function(child) {
        child._beforeMount();
    });
};
/**
 * Lifetime cycle method: beforeMount
 */
p.beforeMount = function() {};

p._afterMount = function() {
    var I = this, actions = I._actions;
    I._mounted = true;
    I.afterMount();
    actions.forEach(function(action) {
        action.afterMount();
    });
    this._children.forEach(function(child) {
        child._afterMount();
    });
};
/**
 * Lifetime cycle method: afterMount
 */
p.afterMount = function() {};

p._beforeUnmount = function() {
    var I = this, actions = I._actions;
    actions.forEach(function(action) {
            action.beforeUnmount();
    });
    I.beforeUnmount();
};
/**
 * Lifetime cycle method: beforeUnmount
 */
p.beforeUnmount = function() {};

p._afterUnmount = function() {
    var I = this, actions = I._actions;
    actions.forEach(function(action) {
            action.afterUnmount();
    });
    I.afterUnmount();
};

/**
 * Lifetime cycle method: afterUnmount
 */
p.afterUnmount = function() {};

p._draw = function(context) {
    context.save();
    var am = new Matrix(this.state);
    context.transform(am.a, am.b, am.c, am.d, am.x, am.y);
    context.globalAlpha *= this.state.alpha;
    if (this.state.visible) {
        try {
            this.draw(context);
        } catch (e) {
            if(!this._error) {
                console.log(e, this._alias + '.draw', this.draw, this.state)
                this._error = true;
                if(this.getStage().debug) throw e;
            }
        }
    }
    if(this._stopDraw) {
        this._stopDraw = false;
        context.restore();
        return;
    }
    for (var i = 0, l = this._children.length; i < l; i++) {
        var child = this._children[i];
        child._draw(context);
    }
    context.restore();
};

p.stopDraw = function() {
    this._stopDraw = true;
};

/**
 * Abstract method
 * Override it to draw something.
 * @param  {Context} context This context is defined as local.
 */
p.draw = function(context) {};

p._update = function() {
    if (this.state.active) {
        try {
            this.update();
            this._actions.forEach(function(action) {
                action.update();
            });
        } catch (e) {
            if(!this._error) {
                console.log(e, this._alias + '.update', this.update, this.state)
                this._error = true;
                if(this.getStage().debug) throw e;
            }
        }
    }
    if(this._stopUpdate) {
         this._stopUpdate = false;
         return;
    }
    for (var i = 0, l = this._children.length; i < l; i++) {
        var child = this._children[i];
        child._update();
    }
};

p.stopUpdate = function() {
    this._stopUpdate = true;
};

/**
 * Abstract method
 * Override it to update something.
 */
p.update = function() {};

/**
 * swtich mode of One
 * @param  {string} mode
 * @return {core.One} this
 */
p.mode = function(mode) {
    switch (mode) {
        case "hitable":
            this.state.hitable = true;
            this.state.moveable = false;
            this.state.dropable = false;
            break;
        case "moveable":
            this.state.hitable = true;
            this.state.moveable = true;
            this.state.dropable = false;
            break;
        case "dropable":
            this.state.hitable = true;
            this.state.moveable = false;
            this.state.dropable = true;
            break;
        default:
            this.state.hitable = false;
            this.state.moveable = false;
            this.state.dropable = false;
    }
    return this;
};

module.exports = One;

},{"../geom/Point":14,"./Event":3,"./Matrix":4,"underscore":20}],6:[function(require,module,exports){
var actions = {};
    actions.stage = require('./stage');

module.exports = actions;

},{"./stage":7}],7:[function(require,module,exports){
var definer = require('../../helpers/definer');
var MouseEvent = require('../events/MouseEvent');
var Point = require('../../geom/Point')

//AnimationFrame is the most important Action of ionejs.
module.exports.AnimationFrame = definer.defineAction({
    afterCreate: function() {
        var A = this, I = A.one, S = I.state, canvas = I.canvas, context = canvas.getContext('2d');
        var lt = Date.now();
        var frame = function() {
            var t1 = Date.now();
            I._draw(context);
            I._update();
            var t2 = Date.now();
            var dt = t2 - t1;
            if(I.fpslimit != 60)
                setTimeout(frame, (1000/I.fpslimit - dt) > 0 ? (1000/I.fpslimit - dt) : 0);
        	else requestAnimationFrame(frame);

            //show debug info
            var fps = 1000 / (Date.now() - lt);
            lt = Date.now();
            if (I.debug) {
                context.save();
                context.fillStyle = '#000000';
                context.font = 'bold 28px Aerial';
                context.fillText('FPS: ' + (((fps * 100) << 0) / 100), 30, 52);
                context.restore();
            };
        }
        frame();
    }
}, 'ionejs.stage.AnimationFrame');

module.exports.AutoResize = definer.defineAction(function(){
    var A = this, I = A.one, S = I.state, canvas = I.canvas;
    var offsetLeft = canvas.offsetLeft;
    var offsetTop = canvas.offsetTop;
    var p = canvas.offsetParent;
    while(p) {
        offsetLeft += p.offsetLeft;
        offsetTop += p.offsetTop;
        p = p.offsetParent;
    }

    S.width = window.innerWidth - offsetLeft * 2 - 4;
    S.height = window.innerHeight - offsetLeft * 2 - 4;

    if(S.width != canvas.width) canvas.width = S.width;
    if(S.height != canvas.height) canvas.height = S.height;
}, 'ionejs.stage.AutoResize');

module.exports.MouseSensitive = definer.defineAction({
    afterCreate: function() {
        var A = this, I = A.one, S = I.state, canvas = I.canvas;

        var offsetLeft = canvas.offsetLeft;
        var offsetTop = canvas.offsetTop;
        var p = canvas.offsetParent;
        while(p) {
            offsetLeft += p.offsetLeft;
            offsetTop += p.offsetTop;
            p = p.offsetParent;
        }

        var _lastTarget;
        var _onMouse = function(e) {
            var global = new Point(e.pageX - offsetLeft, e.pageY - offsetTop);
            var target = I.hit(global);
            if (!target)
                return;
            if (_lastTarget && _lastTarget !== target) {
                var local = _lastTarget.globalToLocal(global);
                _lastTarget && _lastTarget.dispatchEvent(new MouseEvent({
                    type: "mouseout",
                    global: global,
                    local: local
                }));
            target && target.dispatchEvent(new MouseEvent({
                    type: "mousein",
                    global: global,
                    local: local
            }));
            }
            _lastTarget = target;

            var local = target.globalToLocal(global);
            target.dispatchEvent(new MouseEvent({
                type: e.type,
                global: global,
                local: local
            }));
        };

        var lastPoint;
        canvas.addEventListener('mousedown', function(e) {
            lastPoint = new Point(e.x, e.y);
            _onMouse.apply(null, arguments);
        });

        document.addEventListener('mouseup', function() {
            _onMouse.apply(null, arguments);
        });

        document.addEventListener('mousemove', function() {
            _onMouse.apply(null, arguments);
        });

        canvas.addEventListener('click', function(e) {
            if (lastPoint.distance(new Point(e.x, e.y)) < 13 /*Why 13? YKI.*/ )
                _onMouse.apply(null, arguments);
        });
    }
}, 'ionejs.stage.MouseSensitive');

},{"../../geom/Point":14,"../../helpers/definer":16,"../events/MouseEvent":8}],8:[function(require,module,exports){
var inherits = require('../../utils/inherits');
var Event = require('../../core/Event');

var MouseEvent = function(options) {
    Event.apply(this, arguments);
    var local = options.local.clone();
    var global = options.global.clone();
    this.x = local.x;
    this.y = local.y;
    this.local = local;
    this.global = global;
};

MouseEvent.validate = function(options){};

var p = inherits(MouseEvent, Event);

module.exports = MouseEvent;

},{"../../core/Event":3,"../../utils/inherits":19}],9:[function(require,module,exports){
var events = {};
    events.MouseEvent = require('./MouseEvent');

module.exports = events;

},{"./MouseEvent":8}],10:[function(require,module,exports){
var ionejs = {};
    ionejs.actions = require('./actions');
    ionejs.ones = require('./ones');
    ionejs.events = require('./events');
module.exports = ionejs;

},{"./actions":6,"./events":9,"./ones":12}],11:[function(require,module,exports){
var definer = require('../../helpers/definer');
var One = require('../../core/One');
var stageActions = require('../actions/stage');

module.exports = definer.define({
    afterCreate: function(options) {
        var I = this;
            I._mounted = true;

        if(I.canvas = document.getElementById(options.id))
		    I.addActions(stageActions);
	},

    testHit: function(point) {
        var I = this, S = I.state;
        var x = point.x,
            y = point.y;
        if (x > 0 && x < S.width && y > 0 && y < S.height) return true;
        return false;
    },

    draw: function(context) {
        var I = this, S = I.state;
        context.fillStyle = S.fillStyle;
        context.fillRect(0, 0, S.width, S.height);
	}
}, One, 'ionejs.Stage');

},{"../../core/One":5,"../../helpers/definer":16,"../actions/stage":7}],12:[function(require,module,exports){
var ones = {};
    ones.Stage = require('./Stage');

module.exports = ones;

},{"./Stage":11}],13:[function(require,module,exports){
/**
 * Undrawable context or mathematical context is expected.
 * This class should not be exposed.
 * But currently....
 */
function Matrix2D(a, b, c, d, x, y) {
    this.setValues(a, b, c, d, x, y);
}

function ignorify(args, def) {
    var defult = def || [];
    for (var i = 0, l = def.length; i < l; i++) {
        if (typeof args[i] != "number") args[i] = def[i] || 0;
    }
    return args;
}

var p = Matrix2D.prototype;

p.setValues = function(a, b, c, d, x, y) {
    ignorify(arguments, [1, 0, 0, 1, 0, 0]);

    var keys = ["a", "b", "c", "d", "x", "y"];
    var me = this;
    var args = arguments;
    keys.forEach(function(key, i) {
        me[key] = args[i]
    });
    return this;
};

p.append = function(a, b, c, d, x, y) {
    ignorify(arguments, [1, 0, 0, 1, 0, 0]);

    var a1 = this.a;
    var b1 = this.b;
    var c1 = this.c;
    var d1 = this.d;
    var x1 = this.x;
    var y1 = this.y;

    this.a = a1 * a + c1 * b;
    this.b = b1 * a + d1 * b;
    this.c = a1 * c + c1 * d;
    this.d = b1 * c + d1 * d;
    this.x = a1 * x + c1 * y + x1;
    this.y = b1 * x + d1 * y + y1;

    return this;
};

p.appendMatrix = function(matrix) {
    return this.append(matrix.a, matrix.b, matrix.c, matrix.d, matrix.x, matrix.y);
};

p.prepend = function(a, b, c, d, x, y) {
    var pre = new Matrix2D(a, b, c, d, x, y);
    return this.copy(pre.appendMatrix(this));
};

p.prependMatrix = function(matrix) {
    return this.copy(matrix.appendMatrix(this));
};

p.identity = function() {
    this.a = this.d = 1;
    this.b = this.c = this.x = this.y = 0;
    return this;
};

p.invert = function() {
    var a1 = this.a;
    var b1 = this.b;
    var c1 = this.c;
    var d1 = this.d;
    var x1 = this.x;
    var y1 = this.y;
    var n = a1 * d1 - b1 * c1;

    this.a = d1 / n;
    this.b = -b1 / n;
    this.c = -c1 / n;
    this.d = a1 / n;
    this.x = (c1 * y1 - d1 * x1) / n;
    this.y = (b1 * x1 - a1 * y1) / n;
    return this;
};

p.equals = function(matrix) {
    return this.x === matrix.x && this.y === matrix.y && this.a === matrix.a && this.b === matrix.b && this.c === matrix.c && this.d === matrix.d;
};

p.copy = function(matrix) {
    var keys = ["a", "b", "c", "d", "x", "y"];
    var me = this;
    keys.forEach(function(key) {
        me[key] = matrix[key]
    });
    return this;
};

p.clone = function() {
    return new Matrix2D(this.a, this.b, this.c, this.d, this.tx, this.ty);
};

module.exports = Matrix2D;


},{}],14:[function(require,module,exports){
var Point = function(x, y) {
    this.x = x;
    this.y = y;
};

var p = Point.prototype;

p.distance = function(point){
    var dx = point.x - this.x;
    var dy = point.y - this.y;
    return Math.sqrt(Math.pow(dx, 2)+Math.pow(dy, 2));
};

p.transform = function(matrix){
    var r = matrix.append(1,0,0,1,this.x, this.y);
    this.x = r.x;
    this.y = r.y;
    return this;
};

p.retransform = function(matrix){
    var r = matrix.invert().append(1,0,0,1,this.x, this.y);
    this.x = r.x;
    this.y = r.y;
    return this;
};

p.clone = function(){
    return new Point(this.x, this.y);
};

module.exports = Point;

},{}],15:[function(require,module,exports){
var Creator = function(){
    this.Ones = {};
    this.Actions = {};
};

var p = Creator.prototype;

p.create = function(){
    var I = this;
    var _create = function(conf){
	var config;
        if (typeof conf == 'string')
            config = {
                alias: conf
            };
	else if (conf instanceof Array)
            config = {
                children: conf
            };
	else config = conf;

        config = config || {};
        var One = I.Ones[config.alias || I.defaultAlias]
        var options = config.options || {};
        var groupOptions = config.groupOptions || {};

        var actions = config.actions || [];
        var children = config.children || [];

        var one = new One(options, groupOptions);
        actions.forEach(function(alias) {
            one.addAction(I.Actions[alias]);
        });
        children.forEach(function(config) {
            one.addChild(_create(config));
        });
        return one;
    }
    return _create.apply(this, arguments);
};

module.exports = new Creator();

},{}],16:[function(require,module,exports){
var creator = require('./creator');
var One = require('../core/One');
var Action = require('../core/Action');

var Definer = function(){};
var p = Definer.prototype;

p.defineOne = function(options, alias) {
    return this.define(options, One, alias);
}

p.defineAction = function(options, alias) {
    return this.define(options, Action, alias);
}

p.define = function(optionsOrUpdate, superConstruct, alias){

    //Practice to tell whether the check below is necessary.
    //if(typeof superConstruct != 'function')
    //    throw new Error('SuperConstruct is not function but ' + typeof superConstruct);
    //if(typeof alias != 'string')
    //    throw new Error('Alias is not string but ' + typeof alias);

    var options;
    if(typeof optionsOrUpdate == 'function') options = { update: optionsOrUpdate }
    else options = optionsOrUpdate;

    var fields = {};
    var methods = {};

    for (var i in options) {
        if (typeof options[i] == 'function') 
            methods[i] = options[i];
        else
            fields[i] = options[i];
    }

    var construct = function() {
        var I = this;
        if (superConstruct != undefined) {
            superConstruct.apply(I, arguments);
            I._super = superConstruct.prototype;
            I._alias = alias;
        }
        for (var i in fields) {
            I[i] = fields[i];
        }
    }
    construct._super = superConstruct;
    var p = construct.prototype = Object.create(superConstruct.prototype, {
        constructor: {
            value: construct,
            enumerable: false,
            writable: true,
            configurable: true
        }
    });
    for (var i in methods) {
        p[i] = methods[i];
    }
    var baseConstruct = construct;
    while(baseConstruct._super != undefined)
        baseConstruct = baseConstruct._super;
    if(baseConstruct == One) creator.Ones[alias] = construct;
    if(baseConstruct == Action) creator.Actions[alias] = construct;
    return construct;
};

module.exports = new Definer();

},{"../core/Action":2,"../core/One":5,"./creator":15}],17:[function(require,module,exports){
//Namespace
//genesis
var ionejs = require("./genesis");

//Core
ionejs.Action = require('./core/Action');
ionejs.Event = require("./core/Event");
ionejs.One = require("./core/One");

//Geom
ionejs.Point = require("./geom/Point");
ionejs.Matrix2D = require("./geom/Matrix2D");

var creator = require("./helpers/creator");
    creator.defaultAlias = 'One';
    creator.Ones['One'] = ionejs.One;
    creator.Ones['Stage'] = ionejs.Stage;
    creator.Ones['Painter'] = ionejs.Painter;
    creator.Ones['Cliper'] = ionejs.Cliper;
    creator.Ones['Writer'] = ionejs.Writer;
    creator.Ones['Phantom'] = ionejs.Phantom;

ionejs.create = function(config) {
    return creator.create(config);
};

ionejs.registerOne = function(alias, One) {
    creator.Ones[alias] = One;
};

ionejs.registerAction = function(alias, Action) {
    creator.Actions[alias] = Action;
}

var definer = require('./helpers/definer');
ionejs.define = definer.define;

ionejs.inherits = require('./utils/inherits');
ionejs.blur = require('./utils/blur');
module.exports = ionejs;

},{"./core/Action":2,"./core/Event":3,"./core/One":5,"./genesis":10,"./geom/Matrix2D":13,"./geom/Point":14,"./helpers/creator":15,"./helpers/definer":16,"./utils/blur":18,"./utils/inherits":19}],18:[function(require,module,exports){
module.exports = function(object1, p1, value, param){
    object1[p1] = object1[p1] == value ? 
        object1[p1] : object1[p1]*(1-param) + value*param;
};

},{}],19:[function(require,module,exports){
module.exports = function(construct, superConstruct) {
    return construct.prototype = Object.create(superConstruct.prototype, {
        constructor: {
            value: construct,
            enumerable: false,
            writable: true,
            configurable: true
        }
    });
};

},{}],20:[function(require,module,exports){
//     Underscore.js 1.8.3
//     http://underscorejs.org
//     (c) 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//     Underscore may be freely distributed under the MIT license.

(function() {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `exports` on the server.
  var root = this;

  // Save the previous value of the `_` variable.
  var previousUnderscore = root._;

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

  // Create quick reference variables for speed access to core prototypes.
  var
    push             = ArrayProto.push,
    slice            = ArrayProto.slice,
    toString         = ObjProto.toString,
    hasOwnProperty   = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys,
    nativeBind         = FuncProto.bind,
    nativeCreate       = Object.create;

  // Naked function reference for surrogate-prototype-swapping.
  var Ctor = function(){};

  // Create a safe reference to the Underscore object for use below.
  var _ = function(obj) {
    if (obj instanceof _) return obj;
    if (!(this instanceof _)) return new _(obj);
    this._wrapped = obj;
  };

  // Export the Underscore object for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `_` as a global object.
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    root._ = _;
  }

  // Current version.
  _.VERSION = '1.8.3';

  // Internal function that returns an efficient (for current engines) version
  // of the passed-in callback, to be repeatedly applied in other Underscore
  // functions.
  var optimizeCb = function(func, context, argCount) {
    if (context === void 0) return func;
    switch (argCount == null ? 3 : argCount) {
      case 1: return function(value) {
        return func.call(context, value);
      };
      case 2: return function(value, other) {
        return func.call(context, value, other);
      };
      case 3: return function(value, index, collection) {
        return func.call(context, value, index, collection);
      };
      case 4: return function(accumulator, value, index, collection) {
        return func.call(context, accumulator, value, index, collection);
      };
    }
    return function() {
      return func.apply(context, arguments);
    };
  };

  // A mostly-internal function to generate callbacks that can be applied
  // to each element in a collection, returning the desired result — either
  // identity, an arbitrary callback, a property matcher, or a property accessor.
  var cb = function(value, context, argCount) {
    if (value == null) return _.identity;
    if (_.isFunction(value)) return optimizeCb(value, context, argCount);
    if (_.isObject(value)) return _.matcher(value);
    return _.property(value);
  };
  _.iteratee = function(value, context) {
    return cb(value, context, Infinity);
  };

  // An internal function for creating assigner functions.
  var createAssigner = function(keysFunc, undefinedOnly) {
    return function(obj) {
      var length = arguments.length;
      if (length < 2 || obj == null) return obj;
      for (var index = 1; index < length; index++) {
        var source = arguments[index],
            keys = keysFunc(source),
            l = keys.length;
        for (var i = 0; i < l; i++) {
          var key = keys[i];
          if (!undefinedOnly || obj[key] === void 0) obj[key] = source[key];
        }
      }
      return obj;
    };
  };

  // An internal function for creating a new object that inherits from another.
  var baseCreate = function(prototype) {
    if (!_.isObject(prototype)) return {};
    if (nativeCreate) return nativeCreate(prototype);
    Ctor.prototype = prototype;
    var result = new Ctor;
    Ctor.prototype = null;
    return result;
  };

  var property = function(key) {
    return function(obj) {
      return obj == null ? void 0 : obj[key];
    };
  };

  // Helper for collection methods to determine whether a collection
  // should be iterated as an array or as an object
  // Related: http://people.mozilla.org/~jorendorff/es6-draft.html#sec-tolength
  // Avoids a very nasty iOS 8 JIT bug on ARM-64. #2094
  var MAX_ARRAY_INDEX = Math.pow(2, 53) - 1;
  var getLength = property('length');
  var isArrayLike = function(collection) {
    var length = getLength(collection);
    return typeof length == 'number' && length >= 0 && length <= MAX_ARRAY_INDEX;
  };

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles raw objects in addition to array-likes. Treats all
  // sparse array-likes as if they were dense.
  _.each = _.forEach = function(obj, iteratee, context) {
    iteratee = optimizeCb(iteratee, context);
    var i, length;
    if (isArrayLike(obj)) {
      for (i = 0, length = obj.length; i < length; i++) {
        iteratee(obj[i], i, obj);
      }
    } else {
      var keys = _.keys(obj);
      for (i = 0, length = keys.length; i < length; i++) {
        iteratee(obj[keys[i]], keys[i], obj);
      }
    }
    return obj;
  };

  // Return the results of applying the iteratee to each element.
  _.map = _.collect = function(obj, iteratee, context) {
    iteratee = cb(iteratee, context);
    var keys = !isArrayLike(obj) && _.keys(obj),
        length = (keys || obj).length,
        results = Array(length);
    for (var index = 0; index < length; index++) {
      var currentKey = keys ? keys[index] : index;
      results[index] = iteratee(obj[currentKey], currentKey, obj);
    }
    return results;
  };

  // Create a reducing function iterating left or right.
  function createReduce(dir) {
    // Optimized iterator function as using arguments.length
    // in the main function will deoptimize the, see #1991.
    function iterator(obj, iteratee, memo, keys, index, length) {
      for (; index >= 0 && index < length; index += dir) {
        var currentKey = keys ? keys[index] : index;
        memo = iteratee(memo, obj[currentKey], currentKey, obj);
      }
      return memo;
    }

    return function(obj, iteratee, memo, context) {
      iteratee = optimizeCb(iteratee, context, 4);
      var keys = !isArrayLike(obj) && _.keys(obj),
          length = (keys || obj).length,
          index = dir > 0 ? 0 : length - 1;
      // Determine the initial value if none is provided.
      if (arguments.length < 3) {
        memo = obj[keys ? keys[index] : index];
        index += dir;
      }
      return iterator(obj, iteratee, memo, keys, index, length);
    };
  }

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`.
  _.reduce = _.foldl = _.inject = createReduce(1);

  // The right-associative version of reduce, also known as `foldr`.
  _.reduceRight = _.foldr = createReduce(-1);

  // Return the first value which passes a truth test. Aliased as `detect`.
  _.find = _.detect = function(obj, predicate, context) {
    var key;
    if (isArrayLike(obj)) {
      key = _.findIndex(obj, predicate, context);
    } else {
      key = _.findKey(obj, predicate, context);
    }
    if (key !== void 0 && key !== -1) return obj[key];
  };

  // Return all the elements that pass a truth test.
  // Aliased as `select`.
  _.filter = _.select = function(obj, predicate, context) {
    var results = [];
    predicate = cb(predicate, context);
    _.each(obj, function(value, index, list) {
      if (predicate(value, index, list)) results.push(value);
    });
    return results;
  };

  // Return all the elements for which a truth test fails.
  _.reject = function(obj, predicate, context) {
    return _.filter(obj, _.negate(cb(predicate)), context);
  };

  // Determine whether all of the elements match a truth test.
  // Aliased as `all`.
  _.every = _.all = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    var keys = !isArrayLike(obj) && _.keys(obj),
        length = (keys || obj).length;
    for (var index = 0; index < length; index++) {
      var currentKey = keys ? keys[index] : index;
      if (!predicate(obj[currentKey], currentKey, obj)) return false;
    }
    return true;
  };

  // Determine if at least one element in the object matches a truth test.
  // Aliased as `any`.
  _.some = _.any = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    var keys = !isArrayLike(obj) && _.keys(obj),
        length = (keys || obj).length;
    for (var index = 0; index < length; index++) {
      var currentKey = keys ? keys[index] : index;
      if (predicate(obj[currentKey], currentKey, obj)) return true;
    }
    return false;
  };

  // Determine if the array or object contains a given item (using `===`).
  // Aliased as `includes` and `include`.
  _.contains = _.includes = _.include = function(obj, item, fromIndex, guard) {
    if (!isArrayLike(obj)) obj = _.values(obj);
    if (typeof fromIndex != 'number' || guard) fromIndex = 0;
    return _.indexOf(obj, item, fromIndex) >= 0;
  };

  // Invoke a method (with arguments) on every item in a collection.
  _.invoke = function(obj, method) {
    var args = slice.call(arguments, 2);
    var isFunc = _.isFunction(method);
    return _.map(obj, function(value) {
      var func = isFunc ? method : value[method];
      return func == null ? func : func.apply(value, args);
    });
  };

  // Convenience version of a common use case of `map`: fetching a property.
  _.pluck = function(obj, key) {
    return _.map(obj, _.property(key));
  };

  // Convenience version of a common use case of `filter`: selecting only objects
  // containing specific `key:value` pairs.
  _.where = function(obj, attrs) {
    return _.filter(obj, _.matcher(attrs));
  };

  // Convenience version of a common use case of `find`: getting the first object
  // containing specific `key:value` pairs.
  _.findWhere = function(obj, attrs) {
    return _.find(obj, _.matcher(attrs));
  };

  // Return the maximum element (or element-based computation).
  _.max = function(obj, iteratee, context) {
    var result = -Infinity, lastComputed = -Infinity,
        value, computed;
    if (iteratee == null && obj != null) {
      obj = isArrayLike(obj) ? obj : _.values(obj);
      for (var i = 0, length = obj.length; i < length; i++) {
        value = obj[i];
        if (value > result) {
          result = value;
        }
      }
    } else {
      iteratee = cb(iteratee, context);
      _.each(obj, function(value, index, list) {
        computed = iteratee(value, index, list);
        if (computed > lastComputed || computed === -Infinity && result === -Infinity) {
          result = value;
          lastComputed = computed;
        }
      });
    }
    return result;
  };

  // Return the minimum element (or element-based computation).
  _.min = function(obj, iteratee, context) {
    var result = Infinity, lastComputed = Infinity,
        value, computed;
    if (iteratee == null && obj != null) {
      obj = isArrayLike(obj) ? obj : _.values(obj);
      for (var i = 0, length = obj.length; i < length; i++) {
        value = obj[i];
        if (value < result) {
          result = value;
        }
      }
    } else {
      iteratee = cb(iteratee, context);
      _.each(obj, function(value, index, list) {
        computed = iteratee(value, index, list);
        if (computed < lastComputed || computed === Infinity && result === Infinity) {
          result = value;
          lastComputed = computed;
        }
      });
    }
    return result;
  };

  // Shuffle a collection, using the modern version of the
  // [Fisher-Yates shuffle](http://en.wikipedia.org/wiki/Fisher–Yates_shuffle).
  _.shuffle = function(obj) {
    var set = isArrayLike(obj) ? obj : _.values(obj);
    var length = set.length;
    var shuffled = Array(length);
    for (var index = 0, rand; index < length; index++) {
      rand = _.random(0, index);
      if (rand !== index) shuffled[index] = shuffled[rand];
      shuffled[rand] = set[index];
    }
    return shuffled;
  };

  // Sample **n** random values from a collection.
  // If **n** is not specified, returns a single random element.
  // The internal `guard` argument allows it to work with `map`.
  _.sample = function(obj, n, guard) {
    if (n == null || guard) {
      if (!isArrayLike(obj)) obj = _.values(obj);
      return obj[_.random(obj.length - 1)];
    }
    return _.shuffle(obj).slice(0, Math.max(0, n));
  };

  // Sort the object's values by a criterion produced by an iteratee.
  _.sortBy = function(obj, iteratee, context) {
    iteratee = cb(iteratee, context);
    return _.pluck(_.map(obj, function(value, index, list) {
      return {
        value: value,
        index: index,
        criteria: iteratee(value, index, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria;
      var b = right.criteria;
      if (a !== b) {
        if (a > b || a === void 0) return 1;
        if (a < b || b === void 0) return -1;
      }
      return left.index - right.index;
    }), 'value');
  };

  // An internal function used for aggregate "group by" operations.
  var group = function(behavior) {
    return function(obj, iteratee, context) {
      var result = {};
      iteratee = cb(iteratee, context);
      _.each(obj, function(value, index) {
        var key = iteratee(value, index, obj);
        behavior(result, value, key);
      });
      return result;
    };
  };

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  _.groupBy = group(function(result, value, key) {
    if (_.has(result, key)) result[key].push(value); else result[key] = [value];
  });

  // Indexes the object's values by a criterion, similar to `groupBy`, but for
  // when you know that your index values will be unique.
  _.indexBy = group(function(result, value, key) {
    result[key] = value;
  });

  // Counts instances of an object that group by a certain criterion. Pass
  // either a string attribute to count by, or a function that returns the
  // criterion.
  _.countBy = group(function(result, value, key) {
    if (_.has(result, key)) result[key]++; else result[key] = 1;
  });

  // Safely create a real, live array from anything iterable.
  _.toArray = function(obj) {
    if (!obj) return [];
    if (_.isArray(obj)) return slice.call(obj);
    if (isArrayLike(obj)) return _.map(obj, _.identity);
    return _.values(obj);
  };

  // Return the number of elements in an object.
  _.size = function(obj) {
    if (obj == null) return 0;
    return isArrayLike(obj) ? obj.length : _.keys(obj).length;
  };

  // Split a collection into two arrays: one whose elements all satisfy the given
  // predicate, and one whose elements all do not satisfy the predicate.
  _.partition = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    var pass = [], fail = [];
    _.each(obj, function(value, key, obj) {
      (predicate(value, key, obj) ? pass : fail).push(value);
    });
    return [pass, fail];
  };

  // Array Functions
  // ---------------

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. Aliased as `head` and `take`. The **guard** check
  // allows it to work with `_.map`.
  _.first = _.head = _.take = function(array, n, guard) {
    if (array == null) return void 0;
    if (n == null || guard) return array[0];
    return _.initial(array, array.length - n);
  };

  // Returns everything but the last entry of the array. Especially useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N.
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, Math.max(0, array.length - (n == null || guard ? 1 : n)));
  };

  // Get the last element of an array. Passing **n** will return the last N
  // values in the array.
  _.last = function(array, n, guard) {
    if (array == null) return void 0;
    if (n == null || guard) return array[array.length - 1];
    return _.rest(array, Math.max(0, array.length - n));
  };

  // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
  // Especially useful on the arguments object. Passing an **n** will return
  // the rest N values in the array.
  _.rest = _.tail = _.drop = function(array, n, guard) {
    return slice.call(array, n == null || guard ? 1 : n);
  };

  // Trim out all falsy values from an array.
  _.compact = function(array) {
    return _.filter(array, _.identity);
  };

  // Internal implementation of a recursive `flatten` function.
  var flatten = function(input, shallow, strict, startIndex) {
    var output = [], idx = 0;
    for (var i = startIndex || 0, length = getLength(input); i < length; i++) {
      var value = input[i];
      if (isArrayLike(value) && (_.isArray(value) || _.isArguments(value))) {
        //flatten current level of array or arguments object
        if (!shallow) value = flatten(value, shallow, strict);
        var j = 0, len = value.length;
        output.length += len;
        while (j < len) {
          output[idx++] = value[j++];
        }
      } else if (!strict) {
        output[idx++] = value;
      }
    }
    return output;
  };

  // Flatten out an array, either recursively (by default), or just one level.
  _.flatten = function(array, shallow) {
    return flatten(array, shallow, false);
  };

  // Return a version of the array that does not contain the specified value(s).
  _.without = function(array) {
    return _.difference(array, slice.call(arguments, 1));
  };

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  _.uniq = _.unique = function(array, isSorted, iteratee, context) {
    if (!_.isBoolean(isSorted)) {
      context = iteratee;
      iteratee = isSorted;
      isSorted = false;
    }
    if (iteratee != null) iteratee = cb(iteratee, context);
    var result = [];
    var seen = [];
    for (var i = 0, length = getLength(array); i < length; i++) {
      var value = array[i],
          computed = iteratee ? iteratee(value, i, array) : value;
      if (isSorted) {
        if (!i || seen !== computed) result.push(value);
        seen = computed;
      } else if (iteratee) {
        if (!_.contains(seen, computed)) {
          seen.push(computed);
          result.push(value);
        }
      } else if (!_.contains(result, value)) {
        result.push(value);
      }
    }
    return result;
  };

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  _.union = function() {
    return _.uniq(flatten(arguments, true, true));
  };

  // Produce an array that contains every item shared between all the
  // passed-in arrays.
  _.intersection = function(array) {
    var result = [];
    var argsLength = arguments.length;
    for (var i = 0, length = getLength(array); i < length; i++) {
      var item = array[i];
      if (_.contains(result, item)) continue;
      for (var j = 1; j < argsLength; j++) {
        if (!_.contains(arguments[j], item)) break;
      }
      if (j === argsLength) result.push(item);
    }
    return result;
  };

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  _.difference = function(array) {
    var rest = flatten(arguments, true, true, 1);
    return _.filter(array, function(value){
      return !_.contains(rest, value);
    });
  };

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  _.zip = function() {
    return _.unzip(arguments);
  };

  // Complement of _.zip. Unzip accepts an array of arrays and groups
  // each array's elements on shared indices
  _.unzip = function(array) {
    var length = array && _.max(array, getLength).length || 0;
    var result = Array(length);

    for (var index = 0; index < length; index++) {
      result[index] = _.pluck(array, index);
    }
    return result;
  };

  // Converts lists into objects. Pass either a single array of `[key, value]`
  // pairs, or two parallel arrays of the same length -- one of keys, and one of
  // the corresponding values.
  _.object = function(list, values) {
    var result = {};
    for (var i = 0, length = getLength(list); i < length; i++) {
      if (values) {
        result[list[i]] = values[i];
      } else {
        result[list[i][0]] = list[i][1];
      }
    }
    return result;
  };

  // Generator function to create the findIndex and findLastIndex functions
  function createPredicateIndexFinder(dir) {
    return function(array, predicate, context) {
      predicate = cb(predicate, context);
      var length = getLength(array);
      var index = dir > 0 ? 0 : length - 1;
      for (; index >= 0 && index < length; index += dir) {
        if (predicate(array[index], index, array)) return index;
      }
      return -1;
    };
  }

  // Returns the first index on an array-like that passes a predicate test
  _.findIndex = createPredicateIndexFinder(1);
  _.findLastIndex = createPredicateIndexFinder(-1);

  // Use a comparator function to figure out the smallest index at which
  // an object should be inserted so as to maintain order. Uses binary search.
  _.sortedIndex = function(array, obj, iteratee, context) {
    iteratee = cb(iteratee, context, 1);
    var value = iteratee(obj);
    var low = 0, high = getLength(array);
    while (low < high) {
      var mid = Math.floor((low + high) / 2);
      if (iteratee(array[mid]) < value) low = mid + 1; else high = mid;
    }
    return low;
  };

  // Generator function to create the indexOf and lastIndexOf functions
  function createIndexFinder(dir, predicateFind, sortedIndex) {
    return function(array, item, idx) {
      var i = 0, length = getLength(array);
      if (typeof idx == 'number') {
        if (dir > 0) {
            i = idx >= 0 ? idx : Math.max(idx + length, i);
        } else {
            length = idx >= 0 ? Math.min(idx + 1, length) : idx + length + 1;
        }
      } else if (sortedIndex && idx && length) {
        idx = sortedIndex(array, item);
        return array[idx] === item ? idx : -1;
      }
      if (item !== item) {
        idx = predicateFind(slice.call(array, i, length), _.isNaN);
        return idx >= 0 ? idx + i : -1;
      }
      for (idx = dir > 0 ? i : length - 1; idx >= 0 && idx < length; idx += dir) {
        if (array[idx] === item) return idx;
      }
      return -1;
    };
  }

  // Return the position of the first occurrence of an item in an array,
  // or -1 if the item is not included in the array.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  _.indexOf = createIndexFinder(1, _.findIndex, _.sortedIndex);
  _.lastIndexOf = createIndexFinder(-1, _.findLastIndex);

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  _.range = function(start, stop, step) {
    if (stop == null) {
      stop = start || 0;
      start = 0;
    }
    step = step || 1;

    var length = Math.max(Math.ceil((stop - start) / step), 0);
    var range = Array(length);

    for (var idx = 0; idx < length; idx++, start += step) {
      range[idx] = start;
    }

    return range;
  };

  // Function (ahem) Functions
  // ------------------

  // Determines whether to execute a function as a constructor
  // or a normal function with the provided arguments
  var executeBound = function(sourceFunc, boundFunc, context, callingContext, args) {
    if (!(callingContext instanceof boundFunc)) return sourceFunc.apply(context, args);
    var self = baseCreate(sourceFunc.prototype);
    var result = sourceFunc.apply(self, args);
    if (_.isObject(result)) return result;
    return self;
  };

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Delegates to **ECMAScript 5**'s native `Function.bind` if
  // available.
  _.bind = function(func, context) {
    if (nativeBind && func.bind === nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    if (!_.isFunction(func)) throw new TypeError('Bind must be called on a function');
    var args = slice.call(arguments, 2);
    var bound = function() {
      return executeBound(func, bound, context, this, args.concat(slice.call(arguments)));
    };
    return bound;
  };

  // Partially apply a function by creating a version that has had some of its
  // arguments pre-filled, without changing its dynamic `this` context. _ acts
  // as a placeholder, allowing any combination of arguments to be pre-filled.
  _.partial = function(func) {
    var boundArgs = slice.call(arguments, 1);
    var bound = function() {
      var position = 0, length = boundArgs.length;
      var args = Array(length);
      for (var i = 0; i < length; i++) {
        args[i] = boundArgs[i] === _ ? arguments[position++] : boundArgs[i];
      }
      while (position < arguments.length) args.push(arguments[position++]);
      return executeBound(func, bound, this, this, args);
    };
    return bound;
  };

  // Bind a number of an object's methods to that object. Remaining arguments
  // are the method names to be bound. Useful for ensuring that all callbacks
  // defined on an object belong to it.
  _.bindAll = function(obj) {
    var i, length = arguments.length, key;
    if (length <= 1) throw new Error('bindAll must be passed function names');
    for (i = 1; i < length; i++) {
      key = arguments[i];
      obj[key] = _.bind(obj[key], obj);
    }
    return obj;
  };

  // Memoize an expensive function by storing its results.
  _.memoize = function(func, hasher) {
    var memoize = function(key) {
      var cache = memoize.cache;
      var address = '' + (hasher ? hasher.apply(this, arguments) : key);
      if (!_.has(cache, address)) cache[address] = func.apply(this, arguments);
      return cache[address];
    };
    memoize.cache = {};
    return memoize;
  };

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  _.delay = function(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function(){
      return func.apply(null, args);
    }, wait);
  };

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  _.defer = _.partial(_.delay, _, 1);

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time. Normally, the throttled function will run
  // as much as it can, without ever going more than once per `wait` duration;
  // but if you'd like to disable the execution on the leading edge, pass
  // `{leading: false}`. To disable execution on the trailing edge, ditto.
  _.throttle = function(func, wait, options) {
    var context, args, result;
    var timeout = null;
    var previous = 0;
    if (!options) options = {};
    var later = function() {
      previous = options.leading === false ? 0 : _.now();
      timeout = null;
      result = func.apply(context, args);
      if (!timeout) context = args = null;
    };
    return function() {
      var now = _.now();
      if (!previous && options.leading === false) previous = now;
      var remaining = wait - (now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0 || remaining > wait) {
        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }
        previous = now;
        result = func.apply(context, args);
        if (!timeout) context = args = null;
      } else if (!timeout && options.trailing !== false) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    };
  };

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  _.debounce = function(func, wait, immediate) {
    var timeout, args, context, timestamp, result;

    var later = function() {
      var last = _.now() - timestamp;

      if (last < wait && last >= 0) {
        timeout = setTimeout(later, wait - last);
      } else {
        timeout = null;
        if (!immediate) {
          result = func.apply(context, args);
          if (!timeout) context = args = null;
        }
      }
    };

    return function() {
      context = this;
      args = arguments;
      timestamp = _.now();
      var callNow = immediate && !timeout;
      if (!timeout) timeout = setTimeout(later, wait);
      if (callNow) {
        result = func.apply(context, args);
        context = args = null;
      }

      return result;
    };
  };

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  _.wrap = function(func, wrapper) {
    return _.partial(wrapper, func);
  };

  // Returns a negated version of the passed-in predicate.
  _.negate = function(predicate) {
    return function() {
      return !predicate.apply(this, arguments);
    };
  };

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  _.compose = function() {
    var args = arguments;
    var start = args.length - 1;
    return function() {
      var i = start;
      var result = args[start].apply(this, arguments);
      while (i--) result = args[i].call(this, result);
      return result;
    };
  };

  // Returns a function that will only be executed on and after the Nth call.
  _.after = function(times, func) {
    return function() {
      if (--times < 1) {
        return func.apply(this, arguments);
      }
    };
  };

  // Returns a function that will only be executed up to (but not including) the Nth call.
  _.before = function(times, func) {
    var memo;
    return function() {
      if (--times > 0) {
        memo = func.apply(this, arguments);
      }
      if (times <= 1) func = null;
      return memo;
    };
  };

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  _.once = _.partial(_.before, 2);

  // Object Functions
  // ----------------

  // Keys in IE < 9 that won't be iterated by `for key in ...` and thus missed.
  var hasEnumBug = !{toString: null}.propertyIsEnumerable('toString');
  var nonEnumerableProps = ['valueOf', 'isPrototypeOf', 'toString',
                      'propertyIsEnumerable', 'hasOwnProperty', 'toLocaleString'];

  function collectNonEnumProps(obj, keys) {
    var nonEnumIdx = nonEnumerableProps.length;
    var constructor = obj.constructor;
    var proto = (_.isFunction(constructor) && constructor.prototype) || ObjProto;

    // Constructor is a special case.
    var prop = 'constructor';
    if (_.has(obj, prop) && !_.contains(keys, prop)) keys.push(prop);

    while (nonEnumIdx--) {
      prop = nonEnumerableProps[nonEnumIdx];
      if (prop in obj && obj[prop] !== proto[prop] && !_.contains(keys, prop)) {
        keys.push(prop);
      }
    }
  }

  // Retrieve the names of an object's own properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`
  _.keys = function(obj) {
    if (!_.isObject(obj)) return [];
    if (nativeKeys) return nativeKeys(obj);
    var keys = [];
    for (var key in obj) if (_.has(obj, key)) keys.push(key);
    // Ahem, IE < 9.
    if (hasEnumBug) collectNonEnumProps(obj, keys);
    return keys;
  };

  // Retrieve all the property names of an object.
  _.allKeys = function(obj) {
    if (!_.isObject(obj)) return [];
    var keys = [];
    for (var key in obj) keys.push(key);
    // Ahem, IE < 9.
    if (hasEnumBug) collectNonEnumProps(obj, keys);
    return keys;
  };

  // Retrieve the values of an object's properties.
  _.values = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var values = Array(length);
    for (var i = 0; i < length; i++) {
      values[i] = obj[keys[i]];
    }
    return values;
  };

  // Returns the results of applying the iteratee to each element of the object
  // In contrast to _.map it returns an object
  _.mapObject = function(obj, iteratee, context) {
    iteratee = cb(iteratee, context);
    var keys =  _.keys(obj),
          length = keys.length,
          results = {},
          currentKey;
      for (var index = 0; index < length; index++) {
        currentKey = keys[index];
        results[currentKey] = iteratee(obj[currentKey], currentKey, obj);
      }
      return results;
  };

  // Convert an object into a list of `[key, value]` pairs.
  _.pairs = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var pairs = Array(length);
    for (var i = 0; i < length; i++) {
      pairs[i] = [keys[i], obj[keys[i]]];
    }
    return pairs;
  };

  // Invert the keys and values of an object. The values must be serializable.
  _.invert = function(obj) {
    var result = {};
    var keys = _.keys(obj);
    for (var i = 0, length = keys.length; i < length; i++) {
      result[obj[keys[i]]] = keys[i];
    }
    return result;
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`
  _.functions = _.methods = function(obj) {
    var names = [];
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // Extend a given object with all the properties in passed-in object(s).
  _.extend = createAssigner(_.allKeys);

  // Assigns a given object with all the own properties in the passed-in object(s)
  // (https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object/assign)
  _.extendOwn = _.assign = createAssigner(_.keys);

  // Returns the first key on an object that passes a predicate test
  _.findKey = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    var keys = _.keys(obj), key;
    for (var i = 0, length = keys.length; i < length; i++) {
      key = keys[i];
      if (predicate(obj[key], key, obj)) return key;
    }
  };

  // Return a copy of the object only containing the whitelisted properties.
  _.pick = function(object, oiteratee, context) {
    var result = {}, obj = object, iteratee, keys;
    if (obj == null) return result;
    if (_.isFunction(oiteratee)) {
      keys = _.allKeys(obj);
      iteratee = optimizeCb(oiteratee, context);
    } else {
      keys = flatten(arguments, false, false, 1);
      iteratee = function(value, key, obj) { return key in obj; };
      obj = Object(obj);
    }
    for (var i = 0, length = keys.length; i < length; i++) {
      var key = keys[i];
      var value = obj[key];
      if (iteratee(value, key, obj)) result[key] = value;
    }
    return result;
  };

   // Return a copy of the object without the blacklisted properties.
  _.omit = function(obj, iteratee, context) {
    if (_.isFunction(iteratee)) {
      iteratee = _.negate(iteratee);
    } else {
      var keys = _.map(flatten(arguments, false, false, 1), String);
      iteratee = function(value, key) {
        return !_.contains(keys, key);
      };
    }
    return _.pick(obj, iteratee, context);
  };

  // Fill in a given object with default properties.
  _.defaults = createAssigner(_.allKeys, true);

  // Creates an object that inherits from the given prototype object.
  // If additional properties are provided then they will be added to the
  // created object.
  _.create = function(prototype, props) {
    var result = baseCreate(prototype);
    if (props) _.extendOwn(result, props);
    return result;
  };

  // Create a (shallow-cloned) duplicate of an object.
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // Returns whether an object has a given set of `key:value` pairs.
  _.isMatch = function(object, attrs) {
    var keys = _.keys(attrs), length = keys.length;
    if (object == null) return !length;
    var obj = Object(object);
    for (var i = 0; i < length; i++) {
      var key = keys[i];
      if (attrs[key] !== obj[key] || !(key in obj)) return false;
    }
    return true;
  };


  // Internal recursive comparison function for `isEqual`.
  var eq = function(a, b, aStack, bStack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the [Harmony `egal` proposal](http://wiki.ecmascript.org/doku.php?id=harmony:egal).
    if (a === b) return a !== 0 || 1 / a === 1 / b;
    // A strict comparison is necessary because `null == undefined`.
    if (a == null || b == null) return a === b;
    // Unwrap any wrapped objects.
    if (a instanceof _) a = a._wrapped;
    if (b instanceof _) b = b._wrapped;
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className !== toString.call(b)) return false;
    switch (className) {
      // Strings, numbers, regular expressions, dates, and booleans are compared by value.
      case '[object RegExp]':
      // RegExps are coerced to strings for comparison (Note: '' + /a/i === '/a/i')
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return '' + a === '' + b;
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive.
        // Object(NaN) is equivalent to NaN
        if (+a !== +a) return +b !== +b;
        // An `egal` comparison is performed for other numeric values.
        return +a === 0 ? 1 / +a === 1 / b : +a === +b;
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a === +b;
    }

    var areArrays = className === '[object Array]';
    if (!areArrays) {
      if (typeof a != 'object' || typeof b != 'object') return false;

      // Objects with different constructors are not equivalent, but `Object`s or `Array`s
      // from different frames are.
      var aCtor = a.constructor, bCtor = b.constructor;
      if (aCtor !== bCtor && !(_.isFunction(aCtor) && aCtor instanceof aCtor &&
                               _.isFunction(bCtor) && bCtor instanceof bCtor)
                          && ('constructor' in a && 'constructor' in b)) {
        return false;
      }
    }
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.

    // Initializing stack of traversed objects.
    // It's done here since we only need them for objects and arrays comparison.
    aStack = aStack || [];
    bStack = bStack || [];
    var length = aStack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (aStack[length] === a) return bStack[length] === b;
    }

    // Add the first object to the stack of traversed objects.
    aStack.push(a);
    bStack.push(b);

    // Recursively compare objects and arrays.
    if (areArrays) {
      // Compare array lengths to determine if a deep comparison is necessary.
      length = a.length;
      if (length !== b.length) return false;
      // Deep compare the contents, ignoring non-numeric properties.
      while (length--) {
        if (!eq(a[length], b[length], aStack, bStack)) return false;
      }
    } else {
      // Deep compare objects.
      var keys = _.keys(a), key;
      length = keys.length;
      // Ensure that both objects contain the same number of properties before comparing deep equality.
      if (_.keys(b).length !== length) return false;
      while (length--) {
        // Deep compare each member
        key = keys[length];
        if (!(_.has(b, key) && eq(a[key], b[key], aStack, bStack))) return false;
      }
    }
    // Remove the first object from the stack of traversed objects.
    aStack.pop();
    bStack.pop();
    return true;
  };

  // Perform a deep comparison to check if two objects are equal.
  _.isEqual = function(a, b) {
    return eq(a, b);
  };

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  _.isEmpty = function(obj) {
    if (obj == null) return true;
    if (isArrayLike(obj) && (_.isArray(obj) || _.isString(obj) || _.isArguments(obj))) return obj.length === 0;
    return _.keys(obj).length === 0;
  };

  // Is a given value a DOM element?
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType === 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) === '[object Array]';
  };

  // Is a given variable an object?
  _.isObject = function(obj) {
    var type = typeof obj;
    return type === 'function' || type === 'object' && !!obj;
  };

  // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp, isError.
  _.each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp', 'Error'], function(name) {
    _['is' + name] = function(obj) {
      return toString.call(obj) === '[object ' + name + ']';
    };
  });

  // Define a fallback version of the method in browsers (ahem, IE < 9), where
  // there isn't any inspectable "Arguments" type.
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return _.has(obj, 'callee');
    };
  }

  // Optimize `isFunction` if appropriate. Work around some typeof bugs in old v8,
  // IE 11 (#1621), and in Safari 8 (#1929).
  if (typeof /./ != 'function' && typeof Int8Array != 'object') {
    _.isFunction = function(obj) {
      return typeof obj == 'function' || false;
    };
  }

  // Is a given object a finite number?
  _.isFinite = function(obj) {
    return isFinite(obj) && !isNaN(parseFloat(obj));
  };

  // Is the given value `NaN`? (NaN is the only number which does not equal itself).
  _.isNaN = function(obj) {
    return _.isNumber(obj) && obj !== +obj;
  };

  // Is a given value a boolean?
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) === '[object Boolean]';
  };

  // Is a given value equal to null?
  _.isNull = function(obj) {
    return obj === null;
  };

  // Is a given variable undefined?
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // Shortcut function for checking if an object has a given property directly
  // on itself (in other words, not on a prototype).
  _.has = function(obj, key) {
    return obj != null && hasOwnProperty.call(obj, key);
  };

  // Utility Functions
  // -----------------

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // Keep the identity function around for default iteratees.
  _.identity = function(value) {
    return value;
  };

  // Predicate-generating functions. Often useful outside of Underscore.
  _.constant = function(value) {
    return function() {
      return value;
    };
  };

  _.noop = function(){};

  _.property = property;

  // Generates a function for a given object that returns a given property.
  _.propertyOf = function(obj) {
    return obj == null ? function(){} : function(key) {
      return obj[key];
    };
  };

  // Returns a predicate for checking whether an object has a given set of
  // `key:value` pairs.
  _.matcher = _.matches = function(attrs) {
    attrs = _.extendOwn({}, attrs);
    return function(obj) {
      return _.isMatch(obj, attrs);
    };
  };

  // Run a function **n** times.
  _.times = function(n, iteratee, context) {
    var accum = Array(Math.max(0, n));
    iteratee = optimizeCb(iteratee, context, 1);
    for (var i = 0; i < n; i++) accum[i] = iteratee(i);
    return accum;
  };

  // Return a random integer between min and max (inclusive).
  _.random = function(min, max) {
    if (max == null) {
      max = min;
      min = 0;
    }
    return min + Math.floor(Math.random() * (max - min + 1));
  };

  // A (possibly faster) way to get the current timestamp as an integer.
  _.now = Date.now || function() {
    return new Date().getTime();
  };

   // List of HTML entities for escaping.
  var escapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '`': '&#x60;'
  };
  var unescapeMap = _.invert(escapeMap);

  // Functions for escaping and unescaping strings to/from HTML interpolation.
  var createEscaper = function(map) {
    var escaper = function(match) {
      return map[match];
    };
    // Regexes for identifying a key that needs to be escaped
    var source = '(?:' + _.keys(map).join('|') + ')';
    var testRegexp = RegExp(source);
    var replaceRegexp = RegExp(source, 'g');
    return function(string) {
      string = string == null ? '' : '' + string;
      return testRegexp.test(string) ? string.replace(replaceRegexp, escaper) : string;
    };
  };
  _.escape = createEscaper(escapeMap);
  _.unescape = createEscaper(unescapeMap);

  // If the value of the named `property` is a function then invoke it with the
  // `object` as context; otherwise, return it.
  _.result = function(object, property, fallback) {
    var value = object == null ? void 0 : object[property];
    if (value === void 0) {
      value = fallback;
    }
    return _.isFunction(value) ? value.call(object) : value;
  };

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = ++idCounter + '';
    return prefix ? prefix + id : id;
  };

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };

  // When customizing `templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  var noMatch = /(.)^/;

  // Certain characters need to be escaped so that they can be put into a
  // string literal.
  var escapes = {
    "'":      "'",
    '\\':     '\\',
    '\r':     'r',
    '\n':     'n',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  var escaper = /\\|'|\r|\n|\u2028|\u2029/g;

  var escapeChar = function(match) {
    return '\\' + escapes[match];
  };

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  // NB: `oldSettings` only exists for backwards compatibility.
  _.template = function(text, settings, oldSettings) {
    if (!settings && oldSettings) settings = oldSettings;
    settings = _.defaults({}, settings, _.templateSettings);

    // Combine delimiters into one regular expression via alternation.
    var matcher = RegExp([
      (settings.escape || noMatch).source,
      (settings.interpolate || noMatch).source,
      (settings.evaluate || noMatch).source
    ].join('|') + '|$', 'g');

    // Compile the template source, escaping string literals appropriately.
    var index = 0;
    var source = "__p+='";
    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
      source += text.slice(index, offset).replace(escaper, escapeChar);
      index = offset + match.length;

      if (escape) {
        source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
      } else if (interpolate) {
        source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
      } else if (evaluate) {
        source += "';\n" + evaluate + "\n__p+='";
      }

      // Adobe VMs need the match returned to produce the correct offest.
      return match;
    });
    source += "';\n";

    // If a variable is not specified, place data values in local scope.
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __t,__p='',__j=Array.prototype.join," +
      "print=function(){__p+=__j.call(arguments,'');};\n" +
      source + 'return __p;\n';

    try {
      var render = new Function(settings.variable || 'obj', '_', source);
    } catch (e) {
      e.source = source;
      throw e;
    }

    var template = function(data) {
      return render.call(this, data, _);
    };

    // Provide the compiled source as a convenience for precompilation.
    var argument = settings.variable || 'obj';
    template.source = 'function(' + argument + '){\n' + source + '}';

    return template;
  };

  // Add a "chain" function. Start chaining a wrapped Underscore object.
  _.chain = function(obj) {
    var instance = _(obj);
    instance._chain = true;
    return instance;
  };

  // OOP
  // ---------------
  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.

  // Helper function to continue chaining intermediate results.
  var result = function(instance, obj) {
    return instance._chain ? _(obj).chain() : obj;
  };

  // Add your own custom functions to the Underscore object.
  _.mixin = function(obj) {
    _.each(_.functions(obj), function(name) {
      var func = _[name] = obj[name];
      _.prototype[name] = function() {
        var args = [this._wrapped];
        push.apply(args, arguments);
        return result(this, func.apply(_, args));
      };
    });
  };

  // Add all of the Underscore functions to the wrapper object.
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  _.each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      var obj = this._wrapped;
      method.apply(obj, arguments);
      if ((name === 'shift' || name === 'splice') && obj.length === 0) delete obj[0];
      return result(this, obj);
    };
  });

  // Add all accessor Array functions to the wrapper.
  _.each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      return result(this, method.apply(this._wrapped, arguments));
    };
  });

  // Extracts the result from a wrapped and chained object.
  _.prototype.value = function() {
    return this._wrapped;
  };

  // Provide unwrapping proxy for some methods used in engine operations
  // such as arithmetic and JSON stringification.
  _.prototype.valueOf = _.prototype.toJSON = _.prototype.value;

  _.prototype.toString = function() {
    return '' + this._wrapped;
  };

  // AMD registration happens at the end for compatibility with AMD loaders
  // that may not enforce next-turn semantics on modules. Even though general
  // practice for AMD registration is to be anonymous, underscore registers
  // as a named module because, like jQuery, it is a base library that is
  // popular enough to be bundled in a third party lib, but not be part of
  // an AMD load request. Those cases could generate an error when an
  // anonymous define() is called outside of a loader request.
  if (typeof define === 'function' && define.amd) {
    define('underscore', [], function() {
      return _;
    });
  }
}.call(this));

},{}]},{},[1]);
