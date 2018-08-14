/**
 * MageSpecialist
 *
 * NOTICE OF LICENSE
 *
 * This source file is subject to the Open Software License (OSL 3.0)
 * that is bundled with this package in the file LICENSE.txt.
 * It is also available through the world-wide-web at this URL:
 * http://opensource.org/licenses/osl-3.0.php
 * If you did not receive a copy of the license and are unable to
 * obtain it through the world-wide-web, please send an email
 * to info@magespecialist.it so we can send you a copy immediately.
 *
 * @copyright  Copyright (c) 2017 Skeeller srl (http://www.magespecialist.it)
 * @license    http://opensource.org/licenses/osl-3.0.php  Open Software License (OSL 3.0)
 */

'use strict';

define(
    [
        'uiComponent',
        'jquery',
        'ko',
        'MSP_ReCaptcha/js/registry'
    ],
    function (Component, $, ko, registry, undefined) {

        return Component.extend({
            defaults: {
                template: 'MSP_ReCaptcha/reCaptcha'
            },

            _isApiRegistered: undefined,
            captchaIndex: 0,

            initialize: function () {
                this._super();
                this._loadApi();
            },

            /**
             * Loads recaptchaapi API and triggers event, when loaded
             * @private
             */
            _loadApi: function () {
                var element, scriptTag;

                if (this._isApiRegistered !== undefined) {
                    if (this._isApiRegistered === true) {
                        $(window).trigger('recaptchaapiready');
                    }

                    return;
                }
                this._isApiRegistered = false;

                // global function
                window.globalOnRecaptchaOnLoadCallback = function() {
                    this._isApiRegistered = true;
                    $(window).trigger('recaptchaapiready');
                }.bind(this);

                element   = document.createElement('script');
                scriptTag = document.getElementsByTagName('script')[0];

                element.async = true;
                element.src = 'https://www.google.com/recaptcha/api.js'
                    + '?onload=globalOnRecaptchaOnLoadCallback&render=explicit'
                    + (this.settings.lang ? '&hl=' + this.settings.lang : '');

                scriptTag.parentNode.insertBefore(element, scriptTag);

            },

            /**
             * Return true if reCaptcha is visible
             * @returns {Boolean}
             */
            getIsVisible: function () {
                return this.settings.enabled[this.zone];
            },

            /**
             * Recaptcha callback
             * @param {String} token
             */
            reCaptchaCallback: function (token, captchaId) {
                var $parentForm,
                    $reCaptcha,
                    $tokenField;

                $reCaptcha = $('#' + captchaId);
                $parentForm = $reCaptcha.parents('form');
                $tokenField = $parentForm.find('input[name=token]');

                if (this.settings.size === 'invisible') {
                    $tokenField.val(token);
                    $parentForm.submit();
                }
            },

            initializeCaptcha: function(element) {
                var me = this,
                    $parentForm,
                    $wrapper,
                    $reCaptcha,
                    widgetId,
                    listeners,
                    captchaId = (this.getReCaptchaId() + '-' + this.captchaIndex++);

                $wrapper = element;
                $reCaptcha = $wrapper.find('.g-recaptcha');
                $reCaptcha.attr('id', captchaId);

                $parentForm = $wrapper.parents('form');

                // eslint-disable-next-line no-undef
                widgetId = grecaptcha.render(captchaId, {
                    'sitekey': this.settings.siteKey,
                    'theme': this.settings.theme,
                    'size': this.settings.size,
                    'badge': this.badge ? this.badge : this.settings.badge,
                    'callback': function (token) { // jscs:ignore jsDoc
                        me.reCaptchaCallback(token, captchaId);
                    }
                });

                if (this.settings.size === 'invisible') {
                    $parentForm.submit(function (event) {
                        if (!$(this).find('input[name=token]').val()) {
                            // eslint-disable-next-line no-undef
                            grecaptcha.execute(widgetId);
                            event.preventDefault(event);
                            event.stopImmediatePropagation();
                        }
                    });

                    // Move our (last) handler topmost. We need this to avoid submit bindings with ko.
                    listeners = $._data($parentForm[0], 'events').submit;
                    listeners.unshift(listeners.pop());

                    // Create a virtual token field
                    var tokenField = $('<input type="text" name="token" style="display: none" />')[0];
                    $parentForm.append(tokenField);
                } else {
                    tokenField = null;
                }

                registry.ids.push(captchaId);
                registry.captchaList.push(widgetId);
                registry.tokenFields.push(tokenField);
            },

            /**
             * Initialize reCaptcha after first rendering
             */
            initCaptcha: function () {
                var me = this,
                    $parentForm,
                    $wrapper,
                    $reCaptcha,
                    widgetId,
                    listeners;

                if (this.captchaInitialized) {
                    return;
                }

                this.captchaInitialized = true;

                $('.msp-recaptcha-wrapper').each(function() {
                    me.initializeCaptcha($(this));
                });
            },

            /**
             * Render reCaptcha
             */
            renderReCaptcha: function () {
                var me = this;

                if (this.getIsVisible()) {
                    var initCaptchaInterval = setInterval(function () {
                        if (window.grecaptcha && typeof window.grecaptcha.render == 'function') {
                            clearInterval(initCaptchaInterval);
                            me.initCaptcha();
                        }
                    }, 100);
                }
            },

            /**
             * Get reCaptcha ID
             * @returns {String}
             */
            getReCaptchaId: function () {
                if (!this.reCaptchaId) {
                    return 'msp-recaptcha';
                }

                return this.reCaptchaId;
            }
        });
    }
);
