/*global define*/
define([
    '../Core/BoundingSphere',
    '../Core/Cartesian3',
    '../Core/Cartographic',
    '../Core/Color',
    '../Core/defaultValue',
    '../Core/defined',
    '../Core/destroyObject',
    '../Core/defineProperties',
    '../Core/DeveloperError',
    '../Core/Ellipsoid',
    '../Core/getMagic',
    '../Core/getStringFromTypedArray',
    '../Core/loadArrayBuffer',
    '../Core/PinBuilder',
    '../Core/Request',
    '../Core/RequestScheduler',
    '../Core/RequestType',
    '../ThirdParty/when',
    './BillboardCollection',
    './Cesium3DTileContentState',
    './HorizontalOrigin',
    './LabelCollection',
    './PointPrimitiveCollection',
    './PolylineCollection'
], function(
    BoundingSphere,
    Cartesian3,
    Cartographic,
    Color,
    defaultValue,
    defined,
    destroyObject,
    defineProperties,
    DeveloperError,
    Ellipsoid,
    getMagic,
    getStringFromTypedArray,
    loadArrayBuffer,
    PinBuilder,
    Request,
    RequestScheduler,
    RequestType,
    when,
    BillboardCollection,
    Cesium3DTileContentState,
    HorizontalOrigin,
    LabelCollection,
    PointPrimitiveCollection,
    PolylineCollection) {
    'use strict';

    /**
     * @alias Vector3DTileContent
     * @constructor
     *
     * @private
     */
    function Vector3DTileContent(tileset, tile, url) {
        this._labelCollection = undefined;
        this._pointCollection = undefined;
        this._billboardCollection = undefined;
        this._polylineCollection = undefined;
        this._url = url;
        this._tileset = tileset;
        this._tile = tile;

        /**
         * The following properties are part of the {@link Cesium3DTileContent} interface.
         */
        this.state = Cesium3DTileContentState.UNLOADED;
        this.batchTableResources = undefined;
        this.featurePropertiesDirty = false;
        this.boundingSphere = tile.contentBoundingVolume.boundingSphere;

        this._contentReadyToProcessPromise = when.defer();
        this._readyPromise = when.defer();
    }

    defineProperties(Vector3DTileContent.prototype, {
        /**
         * Part of the {@link Cesium3DTileContent} interface.
         */
        featuresLength : {
            get : function() {
                // TODO: implement batchTable for vctr tile format
                return 0;
            }
        },

        /**
         * Part of the {@link Cesium3DTileContent} interface.
         */
        innerContents : {
            get : function() {
                return undefined;
            }
        },

        /**
         * Part of the {@link Cesium3DTileContent} interface.
         */
        contentReadyToProcessPromise : {
            get : function() {
                return this._contentReadyToProcessPromise.promise;
            }
        },

        /**
         * Part of the {@link Cesium3DTileContent} interface.
         */
        readyPromise : {
            get : function() {
                return this._readyPromise.promise;
            }
        }
    });

    /**
     * Part of the {@link Cesium3DTileContent} interface.
     */
    Vector3DTileContent.prototype.hasProperty = function(name) {
        // TODO: implement batchTable for vctr tile format
        return false;
    };

    /**
     * Part of the {@link Cesium3DTileContent} interface.
     */
    Vector3DTileContent.prototype.getFeature = function(batchId) {
        // TODO: implement batchTable for vctr tile format
        return undefined;
    };

    /**
     * Part of the {@link Cesium3DTileContent} interface.
     */
    Vector3DTileContent.prototype.request = function() {
        var that = this;

        var distance = this._tile.distanceToCamera;
        var promise = RequestScheduler.schedule(new Request({
            url : this._url,
            server : this._tile.requestServer,
            requestFunction : loadArrayBuffer,
            type : RequestType.TILES3D,
            distance : distance
        }));

        if (!defined(promise)) {
            return false;
        }

        this.state = Cesium3DTileContentState.LOADING;
        promise.then(function(arrayBuffer) {
            if (that.isDestroyed()) {
                return when.reject('tileset is destroyed');
            }
            that.initialize(arrayBuffer);
        }).otherwise(function(error) {
            that.state = Cesium3DTileContentState.FAILED;
            that._readyPromise.reject(error);
        });

        return true;
    };

    //var sizeOfUint32 = Uint32Array.BYTES_PER_ELEMENT;

    /**
     * Part of the {@link Cesium3DTileContent} interface.
     */
    Vector3DTileContent.prototype.initialize = function(arrayBuffer, byteOffset) {
        byteOffset = defaultValue(byteOffset, 0);

        var uint8Array = new Uint8Array(arrayBuffer);
        /*
        var magic = getMagic(uint8Array, byteOffset);
        if (magic !== 'vctr') {
            throw new DeveloperError('Invalid Vector tile.  Expected magic=vctr.  Read magic=' + magic);
        }

        var view = new DataView(arrayBuffer);
        byteOffset += sizeOfUint32;  // Skip magic number

        //>>includeStart('debug', pragmas.debug);
        var version = view.getUint32(byteOffset, true);
        if (version !== 1) {
            throw new DeveloperError('Only Vector tile version 1 is supported.  Version ' + version + ' is not.');
        }
        //>>includeEnd('debug');
        byteOffset += sizeOfUint32;

        // Skip byteLength
        byteOffset += sizeOfUint32;
        */

        var text = getStringFromTypedArray(uint8Array, byteOffset);
        var json = JSON.parse(text);

        var labelCollection = new LabelCollection();
        //var pointCollection = new PointPrimitiveCollection();
        //var billboardCollection = new BillboardCollection();
        var polylineCollection = new PolylineCollection();

        var offset = new Cartesian3(0.0, 1.0, 1.0);
        Cartesian3.normalize(offset, offset);
        Cartesian3.multiplyByScalar(offset, 100.0, offset);

        //var pinBuilder = new PinBuilder();

        var length = json.length;
        for (var i = 0; i < length; ++i) {
            var label = json[i];
            var labelText = label.text;
            var cartographicArray = label.position;

            var lon = cartographicArray[0];
            var lat = cartographicArray[1];
            var alt = defaultValue(cartographicArray[2], 0.0);

            var cartographic = new Cartographic(lon, lat, alt);
            var position = Ellipsoid.WGS84.cartographicToCartesian(cartographic);

            var offsetPosition = Cartesian3.add(offset, position, new Cartesian3());

            labelCollection.add({
                text : labelText,
                //position : position
                position : offsetPosition
            });
            /*
            pointCollection.add({
                position : position,
                pixelSize : 10.0,
                color : Color.RED,
                outlineColor : Color.BLACK,
                oulineWidth : 2.0
            });
            */
            /*
            billboardCollection.add({
                image : pinBuilder.fromColor(Color.ROYALBLUE, 48).toDataURL(),
                position : position,
                horizontalOrigin : HorizontalOrigin.RIGHT
            });
            */
            polylineCollection.add({
                positions : [position, offsetPosition]
            });
        }

        this.state = Cesium3DTileContentState.PROCESSING;
        this._contentReadyToProcessPromise.resolve(this);

        this._labelCollection = labelCollection;
        //this._pointCollection = pointCollection;
        //this._billboardCollection = billboardCollection;
        this._polylineCollection = polylineCollection;
        this.state = Cesium3DTileContentState.READY;
        this._readyPromise.resolve(this);
    };

    /**
     * Part of the {@link Cesium3DTileContent} interface.
     */
    Vector3DTileContent.prototype.applyDebugSettings = function(enabled, color) {
    };

    /**
     * Part of the {@link Cesium3DTileContent} interface.
     */
    Vector3DTileContent.prototype.update = function(tileset, frameState) {
        this._labelCollection.update(frameState);
        //this._pointCollection.update(frameState);
        //this._billboardCollection.update(frameState);
        this._polylineCollection.update(frameState);
    };

    /**
     * Part of the {@link Cesium3DTileContent} interface.
     */
    Vector3DTileContent.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Part of the {@link Cesium3DTileContent} interface.
     */
    Vector3DTileContent.prototype.destroy = function() {
        this._labelCollection = this._labelCollection && this._labelCollection.destroy();
        //this._pointCollection = this._pointCollection && this._pointCollection.destroy();
        //this._billboardCollection = this._billboardCollection && this._billboardCollection.destroy();
        this._polylineCollection = this._polylineCollection && this._polylineCollection.destroy();
        return destroyObject(this);
    };

    return Vector3DTileContent;
});
