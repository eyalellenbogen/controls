/// <reference path="../typings/index.d.ts" />


declare var exports: any;
if (!window['exports']) {
    window['exports'] = {};
}

interface RollerItem extends HTMLDivElement {
    __data_val: any;
}

interface DataItem {
    text: string;
    value: any;
}

interface ItemPosition {
    index: number;
    isUp: boolean;
}


export class Timepicker {
    private _settings: any;
    private _container: HTMLElement;
    private _itemHeight: number;
    private _selectedHour: number = 11;

    constructor(target: HTMLElement, options: any) {
        this._settings = this.getDefaultSettings();

        var hourPanel = <HTMLElement>target.querySelector('.t-panel .hours');
        // var roller = new RollerPanel(hourPanel);

        // var hourRoller = 


        // this.init(target).then(() => {
        // });
    }

    private init(target: HTMLElement) {
        return new Promise(resolve => {
            this.createContainer();
            var parent = target.parentElement;
            parent.replaceChild(this._container, target);

            //this.createMinutes();

            // this.getItemHeight().then(height => {
            //     this.renderItems(<HTMLElement>this._container.querySelector('.t-panel'));
            //     // this.createHours();
            //     this.bindEvents(<HTMLElement>this._container.querySelector('.t-panel'));

            //     this.createSelectorElement();
            //     resolve();
            // });
        });
    }

    private createSelectorElement() {
        var el = document.createElement('div');
        el.className = 'selector';
        el.style.height = this._itemHeight - 1 + 'px';
        el.style.marginTop = (-1 * this._itemHeight / 2) + 'px';
        this._container.appendChild(el);
    }

    private createContainer() {
        var el = document.createElement('div');
        el.className = 'timepicker';
        el.style.width = this._settings.width + 'px';
        el.style.height = this._settings.height + 'px';
        el.style.position = 'relative';
        el.style.overflow = 'hidden';
        el.innerHTML = `<div class="t-panel">
                            <div class='hours'></div>
                        </div>
                       `;
        this._container = el;
    }



    private moveItems(panel: HTMLElement, y: number) {
        var items = <HTMLElement[]>(<any>panel).querySelectorAll('.item');
        var itemHeight = items[0].clientHeight;
        _.forEach(items, (item, index) => {
            this.setElementTop(item, y + (itemHeight * index));
        });
    }

    private bindEvents(panel: HTMLElement) {

        var hammer = new Hammer.Manager(panel,
            {
                recognizers: [
                    [Hammer.Pan, { direction: Hammer.DIRECTION_VERTICAL }]
                ]
            });

        var primary = <HTMLElement>panel.querySelectorAll('.hours')[0];
        var hourInitPos: number;
        var movePanel = (deltaY: number) => {
            this.moveItems(primary, hourInitPos + deltaY);
        }
        hammer.on('panstart', ev => {
            var firstItem = <HTMLElement>primary.querySelector('.item');
            hourInitPos = firstItem.offsetTop;
            // movePanel(ev.deltaY)
        });

        hammer.on('panup pandown', ev => {
            movePanel(ev.deltaY);
        });
    }

    private getPixelValue(source: string) {
        source = source || '0';
        return parseInt(source.replace('px', ''));
    }

    private setElementTop(element: HTMLElement, top: number) {
        element.style.top = top + 'px';
    }

    private getDefaultSettings() {
        return {
            is24: true,
            width: 400,
            height: 400
        }
    }
}

