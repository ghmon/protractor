Guide = function({ appId, settings, i }) {
    this.node = document.createElement('div');
    this.appId = appId;
    this.settings = settings;
    this.index = i;
    this.locked = false;

    this.phi = 0;
    this.theta = settings[`theta${i}`];

    this.handle = document.createElement('div');
    this.handle.className = `${appId}-guide-handle`;
    this.handle.title = "Double click to lock/unlock";
    this.node.appendChild(this.handle);

    this.node.className = `${appId}-guide`;

    if (i === 0) {
        this.node.style.backgroundColor = settings.guide0Fill;
        this.node.style.borderRightColor = settings.guide0Fill;
        this.handle.style.borderColor = settings.guide0Fill;
    } else {
        this.node.style.backgroundColor = settings.guide1Fill;
        this.node.style.borderRightColor = settings.guide1Fill;
        this.handle.style.borderColor = settings.guide1Fill;
    }

    var move = this.move.bind(this);
    var onMousedown = this.onMousedown.bind(this, move);
    var onMouseup = this.onMouseup.bind(this, move);

    this.node.addEventListener('click', this.click.bind(this));
    this.node.addEventListener('mousedown', onMousedown);

    document.body.addEventListener('mouseup', onMouseup);
    document.body.addEventListener('mouseenter', onMouseup);

    PubSub.subscribe(Channels.MOVE_CONTAINER, this);
    PubSub.subscribe(Channels.MOVE_HANDLE_ROTATE, this);
    PubSub.subscribe(Channels.SET_MODE, this);

    return this.node;
};

Guide.prototype = {
    click: function() {
        function resetDoubleClick() {
            clearTimeout(this.doubleClickTimer);
            this.doubleClickTimer = null;
        }

        if (this.doubleClickTimer) {
            resetDoubleClick.call(this);
            this.doubleClick();
        } else {
            this.doubleClickTimer = setTimeout(resetDoubleClick.bind(this), 500)
        }
    },

    doubleClick: function() {
        if (this.locked) {
            const classes = this.node.className.split(' ');
            const index = classes.indexOf(`${this.appId}-guide-locked`);

            classes.splice(index, 1);
            this.node.className = classes.join(' ');
            this.locked = false;
        } else {
            this.node.className = this.node.className.split(' ')
                .concat(`${this.appId}-guide-locked`).join(' ');
            this.locked = true;
        }
    },

    onMousedown: function(ref, evt) {
        evt.preventDefault();
        document.body.addEventListener('mousemove', ref);
    },

    onMouseup: function(ref, evt) {
        evt.preventDefault();
        document.body.removeEventListener('mousemove', ref);
    },

    move: function(evt) {
        evt.stopPropagation();
        evt.preventDefault();

        if (this.locked || this.mode === "lock") {
            return;
        }

        const bounds = this.node.parentNode.getBoundingClientRect();

        const centerX = bounds.left + bounds.width / 2;
        const centerY = bounds.top + bounds.height / 2;

        let theta = Math.abs(Math.atan((evt.clientY - centerY) / (evt.clientX - centerX)));

        if (evt.clientX < centerX && evt.clientY > centerY) {
            theta = Math.PI + theta;
        } else if (evt.clientX < centerX) {
            theta = Math.PI - theta;
        } else if (evt.clientY > centerY) {
            theta = Math.PI * 2 - theta;
        }

        if (this.settings.markerSnap === true) {
            const interval = this.settings.markerInterval;
            const delta = theta % interval;
            const lowerBound = 0.03;
            const upperBound = this.settings.markerInterval - 0.03;

            if (delta < lowerBound) {
                theta -= delta;
            } else if (delta > upperBound) {
                theta += (interval - delta);
            }
        }

        this.theta = -1 * theta;
        this.transform();
        PubSub.emit(Channels.MOVE_GUIDE, { index: this.index, theta });
    },

    moveContainer: function(msg) {
        this.node.style.width = `${msg.radius}px`;
        this.transform();
    },

    moveHandleRotate: function(msg) {
        this.phi = msg.phi;
        this.transform();
    },

    transform: function() {
        this.node.style.transform = `rotate(${-1 * this.theta + this.phi}rad)`;
    },

    onRotate: function(msg) {
        this.phi = msg.phi;
        this.transform();
    },

    onUpdate: function(chan, msg) {
        switch(chan) {
            case Channels.MOVE_CONTAINER: this.moveContainer(msg); break;
            case Channels.MOVE_HANDLE_ROTATE: this.moveHandleRotate(msg); break;
            case Channels.SET_MODE: this.setMode(msg); break;
        }
    },

    setMode: function(msg) {
        this.mode = msg.mode;
    },
};
