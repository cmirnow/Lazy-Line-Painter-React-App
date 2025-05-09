/*
 * Lazy Line Painter
 * SVG Stroke animation.
 *
 * https://github.com/camoconnell/lazy-line-painter
 * http://www.camoconnell.com
 *
 * Copyright 2013-2015 Cam O'Connell
 * All rights reserved.
 *
 * Licensed under the GNU license.
 *
 */

/*
 *
 * TERMS OF USE - EASING EQUATIONS
 *
 * Open source under the BSD License.
 *
 * Copyright © 2001 Robert Penner
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *
 * Redistributions of source code must retain the above copyright notice, this list of
 * conditions and the following disclaimer.
 * Redistributions in binary form must reproduce the above copyright notice, this list
 * of conditions and the following disclaimer in the documentation and/or other materials
 * provided with the distribution.
 *
 * Neither the name of the author nor the names of contributors may be used to endorse
 * or promote products derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
 *  COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 *  EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE
 *  GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED
 * AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 *  NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED
 * OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 */
import jQuery from "jquery";
jQuery(document).ready(function($) {

    var dataKey = 'lazyLinePainter';
    var className = 'lazylinepainter';

    var methods = {
        init: function(userOpts) {
            return this.each(function() {
                var $this = $(this);
                var data = $this.data(dataKey);
                $this.addClass(className);

                if (!data) {
                    var options = _getOptions($this, userOpts);
                    var totalDuration = options.delay + _getTotalDuration(options.paths);
                    var longestDuration = options.delay + _getLongestDuration(options.paths);

                    options.totalDuration = options.drawSequential ? totalDuration : longestDuration;
                    _setupPaths(options);

                    options.totalDuration *= options.speedMultiplier;

                    $this.append(options.svg);
                    $this.data(dataKey, options);
                    $this.lazylinepainter('resize');
                }
            });
        },

        paint: function() {
            return this.each(function() {
                var $this = $(this);
                var data = $this.data(dataKey);

                $this.lazylinepainter('erase');

                data.rAF = requestAnimationFrame(function(timestamp) {
                    _paint(timestamp, data);
                });

                if (data.onStart !== null) {
                    data.onStart();
                }
            });
        },

        pause: function() {
            return this.each(function() {
                var data = $(this).data(dataKey);

                if (!data.paused) {
                    data.paused = true;
                    cancelAnimationFrame(data.rAF);
                }
            });
        },

        resume: function() {
            return this.each(function() {
                var data = $(this).data(dataKey);

                if (data.paused) {
                    requestAnimationFrame(function(timestamp) {
                        adjustStartTime(timestamp, data);
                    });
                    data.paused = false;
                }
            });
        },

        erase: function() {
            return this.each(function() {
                var $this = $(this);
                var data = $this.data(dataKey);

                data.startTime = null;
                data.elapsedTime = null;
                cancelAnimationFrame(data.rAF);

                data.onStrokeCompleteDone = false;
                data.paused = false;

                for (var i = 0; i < data.paths.length; i++) {
                    var path = data.paths[i];
                    path.el.style.strokeDashoffset = path.length;
                    path.onStrokeCompleteDone = false;
                    path.onStrokeStartDone = false;
                }
            });
        },

        destroy: function() {
            return this.each(function() {
                var $this = $(this);
                $this.removeData(dataKey);
                $this.empty();
                $this.removeClass(className);
            });
        },

        set: function(progress) {
            return this.each(function() {
                var $this = $(this);
                var data = $this.data(dataKey);

                data.progress = progress;
                _updatePaths(data);
            });
        },

        get: function() {
            var $this = $(this);
            var data = $this.data(dataKey);
            return data;
        },

        resize: function() {
            this.each(function() {
                var $this = $(this);
                var data = $this.data(dataKey);
                data.offset = $this.offset();

                for (var i = 0; i < data.paths.length; i++) {
                    _updatePosition(data, data.paths[i]);
                }
            });
        }
    };

    var _getOptions = function($this, userOpts) {
        var defaultOpts = {
            'strokeWidth': 2,
            'strokeDash': null,
            'strokeColor': '#000',
            'strokeOverColor': null,
            'strokeCap': 'round',
            'strokeJoin': 'round',
            'strokeOpacity': 1,
            'onComplete': null,
            'onUpdate': null,
            'onStart': null,
            'onStrokeStart': null,
            'onStrokeComplete': null,
            'delay': 0,
            'ease': null,
            'overrideKey': null,
            'drawSequential': true,
            'speedMultiplier': 1,
            'reverse': false,
            'paused': false,
            'progress': 0,
            'longestDuration': 0,
            'playhead': 0
        };

        var options = $.extend(defaultOpts, userOpts);
        var target = options.overrideKey ? options.overrideKey : $this.attr('id').replace('#', '');
        options.width = options.svgData[target].dimensions.width;
        options.height = options.svgData[target].dimensions.height;
        options.paths = $.extend(true, [], options.svgData[target].strokepath);
        options.svg = _getSVGElement('0 0 ' + options.width + ' ' + options.height);

        return options;
    };

    var _setupPaths = function(options) {
        var startTime = options.reverse ? options.totalDuration : 0;

        for (var i = 0; i < options.paths.length; i++) {
            var path = options.paths[i];

            path.progress = 0;
            path.index = i;
            path.el = _getPath(options, i);
            path.length = _getPathLength(path.el);
            path.delay = path.delay || 0;
            // Удалено: path.duration = path.duration;
            path.positions = _getPathPoints(path.el, path.length);
            path.ease = path.ease || null;

            path.el.style.strokeDasharray = _getStrokeDashArray(path, options, path.length);
            path.el.style.strokeDashoffset = path.length;
            path.el.style.display = 'block';
            path.el.getBoundingClientRect();

            path.onStrokeStart = path.onStrokeStart || null;
            path.onStrokeComplete = path.onStrokeComplete || null;
            path.onStrokeStartDone = false;
            path.onStrokeCompleteDone = false;
            path.onStrokeUpdate = path.onStrokeUpdate || null;

            var startProgress;
            var durationProgress = path.duration / options.totalDuration;

            if (options.reverse) {
                startTime -= path.duration;
                startProgress = startTime / options.totalDuration;
            } else {
                if (options.drawSequential) {
                    startTime = options.playhead + options.delay;
                } else {
                    startTime = path.delay + options.delay;
                }
                startProgress = startTime / options.totalDuration;
            }

            path.startTime = startTime;
            path.startProgress = startProgress;
            path.durationProgress = durationProgress;
            options.playhead += (path.duration + path.delay);
        }
    };

    var adjustStartTime = function(timestamp, data) {
        data.startTime = timestamp - data.elapsedTime;
        requestAnimationFrame(function(timestamp) {
            _paint(timestamp, data);
        });
    };

    var _paint = function(timestamp, data) {
        if (!data.startTime) {
            data.startTime = timestamp;
        }

        if (data.onUpdate !== null) {
            data.onUpdate();
        }

        data.elapsedTime = timestamp - data.startTime;
        data.progress = _getProgress(data.totalDuration, data.startTime, data.elapsedTime, data.ease);

        _updatePaths(data);

        if (data.progress < 1) {
            data.rAF = requestAnimationFrame(function(timestamp) {
                _paint(timestamp, data);
            });
        } else {
            if (data.onComplete !== null) {
                data.onComplete();
            }
        }
    };

    var _updatePaths = function(data) {
        for (var i = 0; i < data.paths.length; i++) {
            var path = data.paths[i];
            var elapsedProgress = _getElapsedProgress(data, path);
            path.progress = _getProgress(1, 0, elapsedProgress, path.ease);
            _setLine(data, path);
            _updatePosition(data, path);
            _updateStrokeCallbacks(data, path);
        }
    };

    var _getElapsedProgress = function(data, path) {
        var elapsedProgress;

        if (data.progress > path.startProgress && data.progress < (path.startProgress + path.durationProgress)) {
            elapsedProgress = (data.progress - path.startProgress) / path.durationProgress;
        } else if (data.progress >= (path.startProgress + path.durationProgress)) {
            elapsedProgress = 1;
        } else if (data.progress <= path.startProgress) {
            elapsedProgress = 0;
        }

        return elapsedProgress;
    };

    var _getProgress = function(duration, start, elapsed, ease) {
        var progress;

        if (elapsed > 0 && elapsed < duration) {
            if (ease) {
                progress = easing[ease](elapsed, 0, 1, duration);
            } else {
                progress = elapsed / duration;
            }
        } else if (elapsed >= duration) {
            progress = 1;
        } else if (elapsed <= start) {
            progress = 0;
        }

        return progress;
    };

    var _setLine = function(data, path) {
        var el = path.el;
        var length = path.progress * path.length;

        if (data.reverse || path.reverse) {
            el.style.strokeDashoffset = -path.length + length;
        } else {
            el.style.strokeDashoffset = path.length - length;
        }
    };

    var _updateStrokeCallbacks = function(data, path) {
        if (path.progress === 1) {
            if (data.onStrokeComplete && !path.onStrokeCompleteDone) {
                data.onStrokeComplete(path);
                if (!path.onStrokeComplete) {
                    path.onStrokeCompleteDone = true;
                }
            }

            if (path.onStrokeComplete && !path.onStrokeCompleteDone) {
                path.onStrokeComplete(path);
                path.onStrokeCompleteDone = true;
            }
        } else if (path.progress > 0.00001) {
            if (data.onStrokeStart && !path.onStrokeStartDone) {
                data.onStrokeStart(path);
                if (!path.onStrokeStart) {
                    path.onStrokeStartDone = true;
                }
            }

            if (path.onStrokeStart && !path.onStrokeStartDone) {
                path.onStrokeStart(path);
                path.onStrokeStartDone = true;
            }

            if (path.onStrokeUpdate) {
                path.onStrokeUpdate(path);
            }
        }
    };

    var _updatePosition = function(data, path) {
        var index = Math.round((path.progress * (path.length - 1)));
        var position = path.positions[index];
        path.position = {
            x: data.offset.left + position.x,
            y: data.offset.top + position.y
        };
    };

    var _getTotalDuration = function(paths) {
        var totalDuration = 0;
        for (var i = 0; i < paths.length; i++) {
            var pathDelay = paths[i].delay || 0;
            totalDuration += (paths[i].duration + pathDelay);
        }
        return totalDuration;
    };

    var _getLongestDuration = function(paths) {
        var longestDuration = 0;
        for (var i = 0; i < paths.length; i++) {
            var pathDelay = paths[i].delay || 0;
            if ((paths[i].duration + pathDelay) > longestDuration) {
                longestDuration = (paths[i].duration + pathDelay);
            }
        }
        return longestDuration;
    };

    var _getPath = function(data, i) {
        var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        var $path = $(path);
        data.svg.append($path);
        $path.attr(_getAttributes(data, data.paths[i]));
        return path;
    };

    var _getPathLength = function(el) {
        return Math.ceil(el.getTotalLength());
    };

    var _getPathPoints = function(el, length) {
        var arr = [];
        for (var i = 0; i < length; i++) {
            var position = el.getPointAtLength(i);
            arr.push({
                x: position.x,
                y: position.y
            });
        }
        return arr;
    };

    var _getAttributes = function(data, value) {
        return {
            'd': value.path,
            'stroke': !value.strokeColor ? data.strokeColor : value.strokeColor,
            'fill-opacity': 0,
            'stroke-opacity': !value.strokeOpacity ? data.strokeOpacity : value.strokeOpacity,
            'stroke-width': !value.strokeWidth ? data.strokeWidth : value.strokeWidth,
            'stroke-linecap': !value.strokeCap ? data.strokeCap : value.strokeCap,
            'stroke-linejoin': !value.strokeJoin ? data.strokeJoin : value.strokeJoin
        };
    };

    var _getSVGElement = function(viewBox) {
        var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttributeNS(null, 'viewBox', viewBox);
        svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        return $(svg);
    };

    var _getStrokeDashArray = function(path, options, length) {
        var strokeDash;
        if (path.strokeDash) {
            strokeDash = _getStrokeDashString(path.strokeDash, length);
        } else if (options.strokeDash) {
            strokeDash = _getStrokeDashString(options.strokeDash, length);
        } else {
            strokeDash = length + ' ' + length;
        }
        return strokeDash;
    };

    var _getStrokeDashString = function(dashArray, length) {
        var strokeDashString = '';
        var strokeDashArray = dashArray.split(',');
        var strokeDashTotal = 0;
        var strokeDashNum;
        var strokeDashRemainder;

        for (var j = strokeDashArray.length - 1; j >= 0; j--) {
            strokeDashTotal += Number(strokeDashArray[j]);
        }
        strokeDashNum = Math.floor(length / strokeDashTotal);
        strokeDashRemainder = length - (strokeDashNum * strokeDashTotal);

        for (var k = strokeDashNum - 1; k >= 0; k--) {
            strokeDashString += (dashArray + ', ');
        }
        var preArray = strokeDashString + strokeDashRemainder + ', ' + length;
        return preArray.split(',').join('px,') + 'px';
    };

    $.fn.lazylinepainter = function(method) {
        if (methods[method]) {
            return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
        } else if (typeof method === 'object' || !method) {
            return methods.init.apply(this, arguments);
        } else {
            console.log('opps - issue finding method');
        }
    };

    var easing = {
        easeLinear: function(t, b, c, d) {
            return c * t / d + b;
        },

        easeInQuad: function(t, b, c, d) {
            return c * (t /= d) * t + b;
        },

        easeOutQuad: function(t, b, c, d) {
            return -c * (t /= d) * (t - 2) + b;
        },

        easeInOutQuad: function(t, b, c, d) {
            if ((t /= d / 2) < 1) return c / 2 * t * t + b;
            return -c / 2 * ((--t) * (t - 2) - 1) + b;
        },

        easeInCubic: function(t, b, c, d) {
            return c * (t /= d) * t * t + b;
        },

        easeOutCubic: function(t, b, c, d) {
            return c * ((t = t / d - 1) * t * t + 1) + b;
        },

        easeInOutCubic: function(t, b, c, d) {
            if ((t /= d / 2) < 1) return c / 2 * t * t * t + b;
            return c / 2 * ((t -= 2) * t * t + 2) + b;
        },

        easeInQuart: function(t, b, c, d) {
            return c * (t /= d) * t * t * t + b;
        },

        easeOutQuart: function(t, b, c, d) {
            return -c * ((t = t / d - 1) * t * t * t - 1) + b;
        },

        easeInOutQuart: function(t, b, c, d) {
            if ((t /= d / 2) < 1) return c / 2 * t * t * t * t + b;
            return -c / 2 * ((t -= 2) * t * t * t - 2) + b;
        },

        easeInQuint: function(t, b, c, d) {
            return c * (t /= d) * t * t * t * t + b;
        },

        easeOutQuint: function(t, b, c, d) {
            return c * ((t = t / d - 1) * t * t * t * t + 1) + b;
        },

        easeInOutQuint: function(t, b, c, d) {
            if ((t /= d / 2) < 1) return c / 2 * t * t * t * t * t + b;
            return c / 2 * ((t -= 2) * t * t * t * t + 2) + b;
        },

        easeInSine: function(t, b, c, d) {
            return -c * Math.cos(t / d * (Math.PI / 2)) + c + b;
        },

        easeOutSine: function(t, b, c, d) {
            return c * Math.sin(t / d * (Math.PI / 2)) + b;
        },

        easeInOutSine: function(t, b, c, d) {
            return -c / 2 * (Math.cos(Math.PI * t / d) - 1) + b;
        },

        easeInExpo: function(t, b, c, d) {
            return (t === 0) ? b : c * Math.pow(2, 10 * (t / d - 1)) + b;
        },

        easeOutExpo: function(t, b, c, d) {
            return (t === d) ? b + c : c * (-Math.pow(2, -10 * t / d) + 1) + b;
        },

        easeInOutExpo: function(t, b, c, d) {
            if (t === 0) return b;
            if (t === d) return b + c;
            if ((t /= d / 2) < 1) return c / 2 * Math.pow(2, 10 * (t - 1)) + b;
            return c / 2 * (-Math.pow(2, -10 * --t) + 2) + b;
        },

        easeInCirc: function(t, b, c, d) {
            return -c * (Math.sqrt(1 - (t /= d) * t) - 1) + b;
        },

        easeOutCirc: function(t, b, c, d) {
            return c * Math.sqrt(1 - (t = t / d - 1) * t) + b;
        },

        easeInOutCirc: function(t, b, c, d) {
            if ((t /= d / 2) < 1) return -c / 2 * (Math.sqrt(1 - t * t) - 1) + b;
            return c / 2 * (Math.sqrt(1 - (t -= 2) * t) + 1) + b;
        },

        easeInElastic: function(t, b, c, d) {
            var s = 1.70158;
            var p = 0;
            var a = c;
            if (t === 0) return b;
            if ((t /= d) === 1) return b + c;
            if (!p) p = d * .3;
            if (a < Math.abs(c)) {
                a = c;
                s = p / 4;
            } else {
                s = p / (2 * Math.PI) * Math.asin(c / a);
            }
            return -(a * Math.pow(2, 10 * (t -= 1)) * Math.sin((t * d - s) * (2 * Math.PI) / p)) + b;
        },

        easeOutElastic: function(t, b, c, d) {
            var s = 1.70158;
            var p = 0;
            var a = c;
            if (t === 0) return b;
            if ((t /= d) === 1) return b + c;
            if (!p) p = d * .3;
            if (a < Math.abs(c)) {
                a = c;
                s = p / 4;
            } else {
                s = p / (2 * Math.PI) * Math.asin(c / a);
            }
            return a * Math.pow(2, -10 * t) * Math.sin((t * d - s) * (2 * Math.PI) / p) + c + b;
        },

        easeInOutElastic: function(t, b, c, d) {
            var s = 1.70158;
            var p = 0;
            var a = c;
            if (t === 0) return b;
            if ((t /= d / 2) === 2) return b + c;
            if (!p) p = d * (.3 * 1.5);
            if (a < Math.abs(c)) {
                a = c;
                s = p / 4;
            } else {
                s = p / (2 * Math.PI) * Math.asin(c / a);
            }
            if (t < 1) return -.5 * (a * Math.pow(2, 10 * (t -= 1)) * Math.sin((t * d - s) * (2 * Math.PI) / p)) + b;
            return a * Math.pow(2, -10 * (t -= 1)) * Math.sin((t * d - s) * (2 * Math.PI) / p) * .5 + c + b;
        },

        easeInBack: function(t, b, c, d, s) {
            if (s === undefined) s = 1.70158;
            return c * (t /= d) * t * ((s + 1) * t - s) + b;
        },

        easeOutBack: function(t, b, c, d, s) {
            if (s === undefined) s = 1.70158;
            return c * ((t = t / d - 1) * t * ((s + 1) * t + s) + 1) + b;
        },

        easeInOutBack: function(t, b, c, d, s) {
            if (s === undefined) s = 1.70158;
            if ((t /= d / 2) < 1) return c / 2 * (t * t * (((s *= (1.525)) + 1) * t - s)) + b;
            return c / 2 * ((t -= 2) * t * (((s *= (1.525)) + 1) * t + s) + 2) + b;
        },

        easeInBounce: function(t, b, c, d) {
            return c - easing.easeOutBounce(d - t, 0, c, d) + b;
        },

        easeOutBounce: function(t, b, c, d) {
            if ((t /= d) < (1 / 2.75)) {
                return c * (7.5625 * t * t) + b;
            } else if (t < (2 / 2.75)) {
                return c * (7.5625 * (t -= (1.5 / 2.75)) * t + .75) + b;
            } else if (t < (2.5 / 2.75)) {
                return c * (7.5625 * (t -= (2.25 / 2.75)) * t + .9375) + b;
            } else {
                return c * (7.5625 * (t -= (2.625 / 2.75)) * t + .984375) + b;
            }
        },

        easeInOutBounce: function(t, b, c, d) {
            if (t < d / 2) return easing.easeInBounce(t * 2, 0, c, d) * .5 + b;
            return easing.easeOutBounce(t * 2 - d, 0, c, d) * .5 + c * .5 + b;
        }
    };

});
