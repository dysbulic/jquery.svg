﻿/* http://keith-wood.name/svg.html
   SVG attribute animations for jQuery v1.4.3.
   Written by Keith Wood (kbwood{at}iinet.com.au) June 2008.
   Dual licensed under the GPL (http://dev.jquery.com/browser/trunk/jquery/GPL-LICENSE.txt) and 
   MIT (http://dev.jquery.com/browser/trunk/jquery/MIT-LICENSE.txt) licenses. 
   Please attribute the author if you use it. */

(function($) { // Hide scope, no $ conflict

// Opacity support is tested on an anchor in a div and fails in svgs
if( document.documentElement.nodeName == 'svg' ) {
    $.support.opacity = true;
}

// Enable animation for all of these SVG numeric attributes -
// named as svg-* or svg* (with first character upper case)
$.each([ 'x', 'y', 'width', 'height', 'rx', 'ry', 'cx', 'cy', 'r', 'x1', 'y1', 'x2', 'y2',
	 'stroke-width', 'strokeWidth', 'opacity', 'fill-opacity', 'fillOpacity',
	 'stroke-opacity', 'strokeOpacity', 'font-size', 'fontSize' ],
       function(i, attrName) {
	   var ccName = attrName.charAt(0).toUpperCase() + attrName.substr(1);
	   $.fx.step['svg' + ccName] = $.fx.step['svg-' + attrName] = function(fx) {
	       var realAttrName = $.svg._attrNames[attrName] || attrName;
	       var attr = fx.elem.attributes.getNamedItem(realAttrName);
	       if (!fx.set) {
		   fx.start = (attr ? parseFloat(attr.nodeValue) : 0);
		   var offset = ( fx.options.curAnim['svg-' + attrName] ||
				  fx.options.curAnim['svg' + ccName] );
		   if (offset[1] == '=') {
		       fx.end = fx.start + parseFloat(offset[0] + offset.substring(2));
		   }
		   $(fx.elem).css(realAttrName, '');
		   fx.set = true;
	       }
	       var value = (fx.pos * (fx.end - fx.start) + fx.start) + (fx.unit == '%' ? '%' : '');
	       (attr ? attr.nodeValue = value : fx.elem.setAttribute(realAttrName, value));
	   };
       }
);

// Enable animation for the SVG viewBox attribute
$.fx.step['svgViewBox'] = $.fx.step['svg-viewBox'] = function(fx) {
	var attr = fx.elem.attributes.getNamedItem('viewBox');
	if (!fx.set) {
		fx.start = parseViewBox(attr ? attr.nodeValue : '');
		var offset = fx.options.curAnim['svg-viewBox'] || fx.options.curAnim['svgViewBox'];
		fx.end = parseViewBox(offset);
		if (/^[+-]=/.exec(offset)) {
			offset = offset.split(' ');
			while (offset.length < 4) {
				offset.push('0');
			}
			for (var i = 0; i < 4; i++) {
				if (/^[+-]=/.exec(offset[i])) {
					fx.end[i] = fx.start[i] + parseFloat(offset[i].replace(/=/, ''));
				}
			}
		}
		fx.set = true;
	}
	var value = $.map(fx.start, function(n, i) {
		return (fx.pos * (fx.end[i] - n) + n);
	}).join(' ');
	(attr ? attr.nodeValue = value : fx.elem.setAttribute('viewBox', value));
};

/* Parse a viewBox definition: x, y, width, height.
   @param  value  (string) the definition
   @return  (number[4]) the extracted values */
function parseViewBox(value) {
	var viewBox = value.split(' ');
	for (var i = 0; i < viewBox.length; i++) {
		viewBox[i] = parseFloat(viewBox[i]);
		if (isNaN(viewBox[i])) {
			viewBox[i] = 0;
		}
	}
	while (viewBox.length < 4) {
		viewBox.push(0);
	}
	return viewBox;
}

    $.fx.step['transform'] = function(fx) {
        var attr = fx.elem.attributes.getNamedItem('transform');
        if (!fx.set) {
	    fx.start = parseTransform(attr ? attr.nodeValue : '');
	    fx.end = parseTransform(fx.end, fx.start, fx.options.clear === false);
	    fx.set = true;
        }
        var transforms = [];
        $.each(fx.end.order, function(idx, op) {
            transforms.push(op + '(' +
                            $.map(fx.end[op], function(val, idx) {
                                var start = (fx.start[op] && fx.start[op][idx] ?
                                             fx.start[op][idx] :
                                             (op == 'scale' ? 1 : 0));
                                return start + fx.pos * (val - start);
                            }).join(',') +
                            ')');
        });
        var transform = transforms.join(' ');
        (attr ? attr.nodeValue = transform : fx.elem.setAttribute('transform', transform));
    }

/**
 * Parses the transform attribute of a svg.
 *
 * This implementation preserves transformation order for application,
 * but flattens the arguments, so transform(10) rotate(20) transform(-15)
 * would come out as transform(-5) rotate(20) transform(-5).
 *
 * Avoiding this requires complex comparison to the original transform
 * or the conversion of all transforms to matrices.
 */
function parseTransform(value, original, preserve) {
    value = value || '';
    if ( typeof value.nodeValue != 'undefined' ) {
	value = value.nodeValue;
    }

    var transform = {};
    transform.order = [];

    var opPattern = /([a-zA-Z]+)\(([^\)]*)\)/g;
    var numPattern = /((?:[+-]=?)?(?:\d+\.?\d*|\d*\.?\d+))/g;

    while ( opResult = opPattern.exec(value) ) {
	var op = opResult[1];
	transform.order.push(op);
	if ( !transform[op] ) {
	    transform[op] = [];
	}
	for ( count = 0; numResult = numPattern.exec(opResult[2]); count++ ) {
            if ( typeof transform[op][count] == 'undefined' ) {
                transform[op][count] = 0;
            }
            // Handle relative transforms ([+-]=)
            if ( numResult[1][1] == '=' ) {
                if ( original && original[op] && typeof original[op][count] != 'undefined' ) {
                    transform[op][count] += original[op][count];
                }
                numResult[1] = numResult[1][0] + numResult[1].substring(2);
            }
            transform[op][count] += parseFloat(numResult[1]);
        }
        if ( original && original[op] ) {
            for ( ; count < original[op].length; count++ ) {
                // Skew is the only transform that is symmetric by default
                transform[op][count] = (op == 'skew') ? transform[op][0] : 0;
            }
        }
    }
    if ( preserve && original ) {
        // If the transform was not overriden, add it to the front of the list
        var ops = $.map(original.order, function(op) { return transform.order.indexOf(op) < 0 ? op : null });
        $.each(ops, function(idx, op) { transform[op] = original[op]; });
        transform.order = $.merge(ops, transform.order);
    }
    return transform;
}

// Enable animation for all of these SVG colour properties - based on jquery.color.js
$.each(['fill', 'stroke'],
	function(i, attrName) {
		var ccName = attrName.charAt(0).toUpperCase() + attrName.substr(1);
		$.fx.step[attrName] = $.fx.step['svg' + ccName] = $.fx.step['svg-' + attrName] = function(fx) {
			if (!fx.set) {
				fx.start = getColour(fx.elem, attrName);
				var toNone = (fx.end == 'none');
				fx.end = (toNone ? getColour(fx.elem.parentNode, attrName) : getRGB(fx.end));
				fx.end[3] = toNone;
				$(fx.elem).css(attrName, '');
				fx.set = true;
			}

			var colour = 'rgb(' + [
				Math.min(Math.max(parseInt((fx.pos * (fx.end[0] - fx.start[0])) + fx.start[0], 10), 0), 255),
				Math.min(Math.max(parseInt((fx.pos * (fx.end[1] - fx.start[1])) + fx.start[1], 10), 0), 255),
				Math.min(Math.max(parseInt((fx.pos * (fx.end[2] - fx.start[2])) + fx.start[2], 10), 0), 255)
			].join(',') + ')';
			colour = (fx.end[3] && fx.state == 1 ? 'none' : colour);

			// The style[prop] method used in jQuery.css doesn't affect the element style
			// The W3C setProperty method works, and updates items that are css styled.
			if ( fx.elem.style && fx.elem.style.setProperty ) {
				fx.elem.style.setProperty(attrName, colour, null);
                        } else {
				var attr = fx.elem.attributes.getNamedItem(attrName);
				(attr ? attr.nodeValue = colour : fx.elem.setAttribute(attrName, colour));
			}
		}
	}
);

/* Find this attribute value somewhere up the node hierarchy.
   @param  elem  (element) the starting element to find the attribute
   @param  attr  (string) the attribute name
   @return  (number[3]) RGB components for the attribute colour */
function getColour(elem, attr) {
	// Attempting to support colors from stylesheets
	return getRGB($(elem).css(attr));
}

/* Parse strings looking for common colour formats.
   @param  colour  (string) colour description to parse
   @return  (number[3]) RGB components of this colour */
function getRGB(colour) {
	var result;
	// Check if we're already dealing with an array of colors
	if (colour && colour.constructor == Array && (colour.length == 3 || colour.length == 4)) {
		return colour;
	}
	// Look for rgb(num,num,num)
	if (result = /rgb\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*\)/.exec(colour)) {
		return [parseInt(result[1], 10), parseInt(result[2], 10), parseInt(result[3], 10)];
	}
	// Look for rgb(num%,num%,num%)
	if (result = /rgb\(\s*([0-9]+(?:\.[0-9]+)?)\%\s*,\s*([0-9]+(?:\.[0-9]+)?)\%\s*,\s*([0-9]+(?:\.[0-9]+)?)\%\s*\)/.exec(colour)) {
		return [parseFloat(result[1]) * 2.55, parseFloat(result[2]) * 2.55,
			parseFloat(result[3]) * 2.55];
	}
	// Look for #a0b1c2
	if (result = /#([a-fA-F0-9]{2})([a-fA-F0-9]{2})([a-fA-F0-9]{2})/.exec(colour)) {
		return [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)];
	}
	// Look for #abc
	if (result = /#([a-fA-F0-9])([a-fA-F0-9])([a-fA-F0-9])/.exec(colour)) {
		return [parseInt(result[1] + result[1], 16), parseInt(result[2] + result[2], 16),
			parseInt(result[3] + result[3], 16)];
	}
	// Otherwise, we're most likely dealing with a named color
	return colours[$.trim(colour).toLowerCase()] || colours['none'];
}

// The SVG named colours
var colours = {
	'':						[255, 255, 255, 1],
	none:					[255, 255, 255, 1],
	aliceblue:				[240, 248, 255],
	antiquewhite:			[250, 235, 215],
	aqua:					[ 0, 255, 255],
	aquamarine:				[127, 255, 212],
	azure:					[240, 255, 255],
	beige:					[245, 245, 220],
	bisque:					[255, 228, 196],
	black:					[ 0, 0, 0],
	blanchedalmond:			[255, 235, 205],
	blue:					[ 0, 0, 255],
	blueviolet:				[138, 43, 226],
	brown:					[165, 42, 42],
	burlywood:				[222, 184, 135],
	cadetblue:				[ 95, 158, 160],
	chartreuse:				[127, 255, 0],
	chocolate:				[210, 105, 30],
	coral:					[255, 127, 80],
	cornflowerblue:			[100, 149, 237],
	cornsilk:				[255, 248, 220],
	crimson:				[220, 20, 60],
	cyan:					[ 0, 255, 255],
	darkblue:				[ 0, 0, 139],
	darkcyan:				[ 0, 139, 139],
	darkgoldenrod:			[184, 134, 11],
	darkgray:				[169, 169, 169],
	darkgreen:				[ 0, 100, 0],
	darkgrey:				[169, 169, 169],
	darkkhaki:				[189, 183, 107],
	darkmagenta:			[139, 0, 139],
	darkolivegreen:			[ 85, 107, 47],
	darkorange:				[255, 140, 0],
	darkorchid:				[153, 50, 204],
	darkred:				[139, 0, 0],
	darksalmon:				[233, 150, 122],
	darkseagreen:			[143, 188, 143],
	darkslateblue:			[ 72, 61, 139],
	darkslategray:			[ 47, 79, 79],
	darkslategrey:			[ 47, 79, 79],
	darkturquoise:			[ 0, 206, 209],
	darkviolet:				[148, 0, 211],
	deeppink:				[255, 20, 147],
	deepskyblue:			[ 0, 191, 255],
	dimgray:				[105, 105, 105],
	dimgrey:				[105, 105, 105],
	dodgerblue:				[ 30, 144, 255],
	firebrick:				[178, 34, 34],
	floralwhite:			[255, 250, 240],
	forestgreen:			[ 34, 139, 34],
	fuchsia:				[255, 0, 255],
	gainsboro:				[220, 220, 220],
	ghostwhite:				[248, 248, 255],
	gold:					[255, 215, 0],
	goldenrod:				[218, 165, 32],
	gray:					[128, 128, 128],
	grey:					[128, 128, 128],
	green:					[ 0, 128, 0],
	greenyellow:			[173, 255, 47],
	honeydew:				[240, 255, 240],
	hotpink:				[255, 105, 180],
	indianred:				[205, 92, 92],
	indigo:					[ 75, 0, 130],
	ivory:					[255, 255, 240],
	khaki:					[240, 230, 140],
	lavender:				[230, 230, 250],
	lavenderblush:			[255, 240, 245],
	lawngreen:				[124, 252, 0],
	lemonchiffon:			[255, 250, 205],
	lightblue:				[173, 216, 230],
	lightcoral:				[240, 128, 128],
	lightcyan:				[224, 255, 255],
	lightgoldenrodyellow:	[250, 250, 210],
	lightgray:				[211, 211, 211],
	lightgreen:				[144, 238, 144],
	lightgrey:				[211, 211, 211],
	lightpink:				[255, 182, 193],
	lightsalmon:			[255, 160, 122],
	lightseagreen:			[ 32, 178, 170],
	lightskyblue:			[135, 206, 250],
	lightslategray:			[119, 136, 153],
	lightslategrey:			[119, 136, 153],
	lightsteelblue:			[176, 196, 222],
	lightyellow:			[255, 255, 224],
	lime:					[ 0, 255, 0],
	limegreen:				[ 50, 205, 50],
	linen:					[250, 240, 230],
	magenta:				[255, 0, 255],
	maroon:					[128, 0, 0],
	mediumaquamarine:		[102, 205, 170],
	mediumblue:				[ 0, 0, 205],
	mediumorchid:			[186, 85, 211],
	mediumpurple:			[147, 112, 219],
	mediumseagreen:			[ 60, 179, 113],
	mediumslateblue:		[123, 104, 238],
	mediumspringgreen:		[ 0, 250, 154],
	mediumturquoise:		[ 72, 209, 204],
	mediumvioletred:		[199, 21, 133],
	midnightblue:			[ 25, 25, 112],
	mintcream:				[245, 255, 250],
	mistyrose:				[255, 228, 225],
	moccasin:				[255, 228, 181],
	navajowhite:			[255, 222, 173],
	navy:					[ 0, 0, 128],
	oldlace:				[253, 245, 230],
	olive:					[128, 128, 0],
	olivedrab:				[107, 142, 35],
	orange:					[255, 165, 0],
	orangered:				[255, 69, 0],
	orchid:					[218, 112, 214],
	palegoldenrod:			[238, 232, 170],
	palegreen:				[152, 251, 152],
	paleturquoise:			[175, 238, 238],
	palevioletred:			[219, 112, 147],
	papayawhip:				[255, 239, 213],
	peachpuff:				[255, 218, 185],
	peru:					[205, 133, 63],
	pink:					[255, 192, 203],
	plum:					[221, 160, 221],
	powderblue:				[176, 224, 230],
	purple:					[128, 0, 128],
	red:					[255, 0, 0],
	rosybrown:				[188, 143, 143],
	royalblue:				[ 65, 105, 225],
	saddlebrown:			[139, 69, 19],
	salmon:					[250, 128, 114],
	sandybrown:				[244, 164, 96],
	seagreen:				[ 46, 139, 87],
	seashell:				[255, 245, 238],
	sienna:					[160, 82, 45],
	silver:					[192, 192, 192],
	skyblue:				[135, 206, 235],
	slateblue:				[106, 90, 205],
	slategray:				[112, 128, 144],
	slategrey:				[112, 128, 144],
	snow:					[255, 250, 250],
	springgreen:			[ 0, 255, 127],
	steelblue:				[ 70, 130, 180],
	tan:					[210, 180, 140],
	teal:					[ 0, 128, 128],
	thistle:				[216, 191, 216],
	tomato:					[255, 99, 71],
	turquoise:				[ 64, 224, 208],
	violet:					[238, 130, 238],
	wheat:					[245, 222, 179],
	white:					[255, 255, 255],
	whitesmoke:				[245, 245, 245],
	yellow:					[255, 255, 0],
	yellowgreen:			[154, 205, 50]
};

})(jQuery);
