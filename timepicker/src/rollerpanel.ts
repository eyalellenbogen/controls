/// <reference path="../typings/index.d.ts" />


declare var exports: any;
if (!window['exports']) {
    window['exports'] = {};
}

interface RollerItem extends HTMLDivElement {
    __data_val: any;
    __selected: boolean;
}

interface DataItem {
    text: string;
    value: any;
}

interface SelectorRange {
    top: number;
    bottom: number;
}

interface ItemPosition {
    index: number;
    isUp: boolean;
}

class RollerPanel {
    private _container: HTMLElement;
    private _panel: HTMLElement;
    private _selectorElement: HTMLElement;
    private _selectedItemPositionInfo: { top: number, bottom: number, relativeOffset: number };
    private _selectedElement: RollerItem;
    private _itemHeight: number;
    private _availableHeight: number;
    private _itemsToRender: number;
    private _selectedValue: any = 4;
    private _itemsToOverflow: number = 0;

    private _dataItems: DataItem[];
    private _rollerItems: RollerItem[] = [];

    private _animDelta: number = 0;
    private _animLastDelta: number = 0;
    private _animState: AnimationState = AnimationState.Stopped;
    private _animFadeFactor: number = 0.95;

    constructor(target: HTMLElement, data: DataItem[], selectedValue: any) {
        this._dataItems = data;
        this._selectedValue = this._dataItems.find((x) => {
            return x.value == selectedValue;
        }) || this._dataItems[0];
        this.init(target);
    }

    private init(target: HTMLElement) {
        return new Promise(resolve => {
            this.createRollerPanel();
            var parent = target.parentElement;
            parent.replaceChild(this._container, target);

            this._panel = <HTMLElement>this._container.querySelector('.item-holder');

            this.getItemHeight().then(height => {
                this.setSelectedItemPositionRange();
                this._availableHeight = this._container.clientHeight;
                this._itemsToRender = Math.floor(this._availableHeight / this._itemHeight) + 2;// + this._itemsToOverflow * 2;
                this.renderItems();
                this.bindEvents();

                this.createSelectorElement();

                resolve();
            });
        });
    }

    private bindEvents() {
        var hammer = new Hammer.Manager(this._container,
            {
                recognizers: [
                    [Hammer.Pan, { direction: Hammer.DIRECTION_VERTICAL }]
                ]
            });

        var cnt = 0;

        var overlay: HTMLElement = document.createElement('div');
        overlay.classList.add('overlay');

        hammer.on('pan', ev => {
            this._animDelta = ev.deltaY;
        });
        hammer.on('panstart', ev => {
            this.initAnimation(ev.deltaY);
        });
        hammer.on('panend', (ev: HammerInput) => {
            this.startAnimationFade();
            this.cleanup();
        });
    }

    private renderFrame = () => {
        if (this._animState == AnimationState.Stopped) return;
        if (this._animState == AnimationState.EasingOut) {
            //manipulate delta to fit east
            this._animDelta = this._animDelta * this._animFadeFactor;

        } else if (this._animState == AnimationState.MovingToSelected) {
            //manipulate delta to move to selected item
        }

        if (this._animDelta) {
            if (Math.abs(this._animDelta) < 1) {
                this._animDelta = 0;
                this._animState = AnimationState.Stopped;
            }
            this.move(this._animDelta - this._animLastDelta);
            this._animLastDelta = this._animDelta;
        }
        window.requestAnimationFrame(this.renderFrame);
    }

    private animateToSelected = () => {

    }

    private startAnimationFade = () => {
        this._animState = AnimationState.EasingOut;
    }

    private initAnimation = (initialDelta: number) => {
        this._animDelta = initialDelta;
        this._animState=AnimationState.Moving;
        window.requestAnimationFrame(this.renderFrame);
    }

    private cleanup() {
        var removeTargets = this._panel.querySelectorAll('.remove');
        for (var i = 0; i < removeTargets.length; i++) {
            var t = removeTargets[i];
            this._panel.removeChild(t);
        }
    }

    private markSelected(item: RollerItem) {
        item.__selected = item.offsetTop < this._selectedItemPositionInfo.top + (this._itemHeight / 2)
            && item.offsetTop > this._selectedItemPositionInfo.top - (this._itemHeight / 2);
        item.classList.toggle('selected', item.__selected);
    }

    private move(deltaY: number) {

        var moveItem = (item: HTMLElement, deltaY: number) => {
            var curY = item.offsetTop;
            item.style.top = curY + deltaY + 'px';
        };

        var setSelected = (item: RollerItem) => {
            //toggle .selected class
            this.markSelected(item);
            this._selectedElement = item.__selected ? item : this._selectedElement;

            if (!item.__selected) return;
            this._selectedValue = item.__data_val;
        };

        var removeItem = (item: RollerItem) => {
            // removing item causes touch events to stop without
            // cancelling for no real reason so we'll remove AFTER touch ended
            item.style.display = 'none';
            item.classList.remove('item');
            item.classList.add('remove');
            var idx = this._rollerItems.indexOf(item);
            this._rollerItems.splice(idx, 1);
        }

        var keepItem = (item: RollerItem, delta: number) => {
            var availableHeight = this._container.clientHeight;
            var top = item.offsetTop + delta;
            if (top >= -1 * this._itemHeight &&
                top <= this._container.clientHeight) {
                return true;
            }
            //dump it
            return false;
        };

        var addMissingItems = (targetItem: RollerItem, addOnTop: boolean, itemsToAdd: number = 1) => {
            if (!itemsToAdd) return;
            for (let i = 0; i < itemsToAdd; i++) {
                let idx = this._dataItems.indexOf(targetItem.__data_val) + (addOnTop ? -1 : 1) * (i + 1);
                let realIndex = this.getRealIndex(idx);
                let rollerItem = this.createItemElement(this._dataItems[realIndex]);
                rollerItem.style.top = (targetItem.offsetTop + (addOnTop ? -1 : 1) * this._itemHeight * (i + 1)) + 'px';
                addOnTop ? this._rollerItems.unshift(rollerItem) : this._rollerItems.push(rollerItem);
            }
        }

        //TODO: remove lodash... this is its' only use here
        _.forEach(this._panel.querySelectorAll('.item'), (item: RollerItem, idx: number) => {
            var keep = keepItem(item, deltaY);
            if (!keep) {
                removeItem(item);
            } else {
                moveItem(item, deltaY);
                setSelected(item);
            }
        });

        //fill in the missing blocks
        var addToTop = deltaY > 0;
        var itemsToAdd: number = 0;
        var item: RollerItem;

        if (addToTop) {
            item = this._rollerItems[0];
            itemsToAdd = Math.ceil(item.offsetHeight / this._itemHeight);
        } else {
            item = this._rollerItems[this._rollerItems.length - 1];
            itemsToAdd =
                Math.ceil(
                    (this._container.clientHeight -
                        (item.offsetTop + this._itemHeight)) / this._itemHeight
                );
        }
        addMissingItems(item, addToTop, itemsToAdd);
    }

    private createItemElement(data: DataItem) {
        var n = <RollerItem>document.createElement('div');
        n.className = 'item';
        n.innerHTML = data.text;
        n.__data_val = data;
        this._panel.appendChild(n);
        return n;
    }

    private getRealIndex(index: number) {
        var totalItems = this._dataItems.length;
        var x = index % totalItems;
        if (x < 0) {
            x += totalItems;
        }
        return x;
    }

    private getRelativeItem(position: number, isUp: boolean) {
        var totalItems = this._dataItems.length;
        var absolutePosition = position % totalItems;
        var targetPosition: number;
        if (isUp) {
            targetPosition = position % totalItems;
        } else {
            targetPosition = 0 - (position % totalItems);
            if (targetPosition < 0) {
                targetPosition = totalItems + targetPosition;
            }
        }
        return this._dataItems[targetPosition];
    }

    private renderItems() {
        var selectedIndex = this._dataItems.indexOf(this._selectedValue);
        var itemsBeforeSelected = (this._selectedItemPositionInfo.top + this._selectedItemPositionInfo.relativeOffset) / this._itemHeight;
        var indexGap = selectedIndex - itemsBeforeSelected;
        var targetIndex = indexGap < 0
            ? this._dataItems.length + (indexGap % this._dataItems.length)
            : indexGap % this._dataItems.length;
        for (var i = 0; i < this._itemsToRender; i++) {
            var idx = i - selectedIndex;
            var item = this._dataItems[(i + targetIndex) % this._dataItems.length];
            var el = this.createItemElement(item);
            var top = (this._itemHeight * i)
                - this._selectedItemPositionInfo.relativeOffset;

            el.style.top = top + 'px';
            this._rollerItems.push(el);
            this.markSelected(el);
        }
    }

    private getItemHeight() {
        return new Promise(resolve => {
            var panel = this._panel;
            var el = document.createElement('div');
            el.className = 'item';
            el.innerHTML = '1';
            panel.appendChild(el);
            window.setTimeout(() => {
                this._itemHeight = el.clientHeight;
                panel.removeChild(el);
                resolve(this._itemHeight);
            });
        });
    }

    private createRollerPanel() {
        var el = document.createElement('div');
        el.className = 'roller-panel';
        el.innerHTML = `<div class="item-holder">
                        </div>`;
        this._container = el;
    }

    private createSelectorElement() {
        var el = document.createElement('div');
        el.className = 'selector';
        el.style.height = this._itemHeight + 'px';
        el.style.marginTop = (-1 * this._itemHeight / 2) + 'px';
        this._selectorElement = <HTMLElement>el;
        this._container.appendChild(el);
    }

    private setSelectedItemPositionRange() {
        var offsetTop = Math.floor(this._container.clientHeight / 2 - this._itemHeight / 2);
        var relativeOffset = this._itemHeight - (offsetTop % this._itemHeight);
        this._selectedItemPositionInfo = {
            top: offsetTop,
            bottom: offsetTop + this._itemHeight,
            relativeOffset: relativeOffset
        };
    }
}

enum AnimationState {
    Moving,
    EasingOut,
    MovingToSelected,
    Stopped
}