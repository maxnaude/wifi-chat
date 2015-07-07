define(function(require) {

    'use strict';
  
    var Backbone    = require('backbone')
      , ModalView   = require('app/views/Modal')
      , ModalModel  = require('app/models/Modal')
    require('jquery.html5-placeholder-shim')
    require('jquery.scrollparent')

    return Backbone.View.extend({

      requiresLogin: false,
      
      title: 'Wifi Chat',
      
      initialize: function (options) {
        if (options) {
          this.router = options.router
          this.options = options
          if (options.model) {
            this.model = options.model
          }
        }
        _.bindAll(this, 'render')
      },

      render: function() {
        this.beforeRender()
        var data = this.model ? this.model.attributes : null
        this.$el.html(this.template(data))
        this.trigger('render')
        this.afterRender()
        $.placeholder.shim()
        return this
      },

      afterRender: function() {},
      
      beforeRender: function() {},

      onDestroy: function() {},

      unbindGlobalListeners: function() {},

      cache: function() {
        this.trigger('cache')
        this.scrollTop = this.$el.scrollParent().scrollTop()
        this.$el.addClass('is-cached')
        this.isCached = true
      },

      retrieve: function() {
        this.$el.removeClass('is-cached')
        this.isCached = false

        if (this.scrollTop) {
          this.$el.scrollParent().scrollTop(this.scrollTop)
        }
        this.trigger('retrieve')
      },
      
      closeView: function() {
        this.unbindGlobalListeners()
        this.onDestroy()
        Object.keys(this.subViews || {}).forEach(function(subView) {
          this.subViews[subView].closeView()
          delete this.subViews[subView]
        }, this)
        this.stopListening()
        this.remove()
      },
      
      closeSubView: function(name) {
        if (!this.subViews || !this.subViews[name]) return
        this.subViews[name].closeView()
        delete this.subViews[name]
      },
      
      showSubView: function(name, view, element) {
        if (!this.subViews) {
          this.subViews = {}
        }
        this.subViews[name] = view
        view.delegateEvents()
        if (element) {
          this.$el.find(element).html(view.render().$el)
        } else {
          this.$el.append(view.render().$el)
        }
      },
      
      showMessage: function(message) {
        this.closeSubView('modal')
        var modal = new ModalView()
        modal.model = new ModalModel({
          message: message,
          showClose: true
        })
        this.showSubView('modal', modal)
        modal.once('close', function() {
          this.closeSubView('modal')
        }, this)
        return modal
      },
      
      showError: function(message) {
        return this.showMessage(message)
      },

      showSpinner: function(message, options) {
        this.closeSubView('modal')
        if (!options) {
          options = {}
        }
        var modal = new ModalView()
        modal.model = new ModalModel({
          type: 'spinner',
          message: message,
          showClose: options.showClose || false,
          opaque: options.opaque || false
        })
        this.showSubView('modal', modal)
        modal.once('close', function() {
          this.closeSubView('modal')
        }, this)
      },

      closeSpinner: function() {
        this.closeSubView('modal')
      }

  })

})
