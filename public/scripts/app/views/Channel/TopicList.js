define(function(require) {

    'use strict';

    var _              = require('underscore')
      , Base           = require('app/views/Base')
      , Topics         = require('app/collections/Topics')
      , TopicItemView  = require('app/views/Channel/TopicItem')
      , log            = require('bows.min')('Views:Channel:TopicList')
    require('jquery.scrollparent')

    return Base.extend({

      template: _.template(require('text!tpl/Channel/TopicList.html')),

      requiresLogin: true,

      infiniteScrollTriggerPoint: 300, // in pixels from the bottom
      isInfiniteScrollLoading: false,

      untouched: true,

      initialize: function(options) {
        _.bindAll(this, 'onScroll')

        this.options = options
        this.router = options.router
        this.collection = new Topics(null, {
          channelJid: this.options.channelJid,
          comparator: false,
        })
        this.collection.on('loaded:topics', this.addTopics, this)

        this.collection.on('error', function() {
          this.showError('Oh no! Could not load topics')
        }, this)

        if (0 !== this.collection.length) {
          return this.addTopics(this.collection.length)
        }
        this.collection.sync()

        this.options.parent.on('cache', this.unbindGlobalListeners, this)
        this.options.parent.on('retrieve', this.bindGlobalListeners, this)
      },

      unbindGlobalListeners: function() {
        this.$el.scrollParent().off('scroll.topicList')
      },

      bindGlobalListeners: function() {
        this.$el.scrollParent().on('scroll.topicList', this.onScroll)
      },

      addTopics: function(length) {

        if (0 === length) {
          return
        }
        var newTopics = this.collection.models.slice(-length)
        var topics = document.createDocumentFragment()
        var self = this

        newTopics.forEach(function(newTopic) {
          var topic = new TopicItemView({
            model: newTopic,
            router: self.router
          })
          topics.appendChild(topic.render().el)
        }, this)
        this.$el.find('.js-topicPosts').append(topics)

        this.isInfiniteScrollLoading = false

        if (this.untouched) {
          this.scrollParent = this.$el.scrollParent()
          this.bindGlobalListeners()
          this.untouched = false
        }

        if (this.collection.allItemsLoaded()) {
          this.$el.find('.js-infiniteLoader').addClass('is-hidden')
          this.scrollParent.off('scroll.topicList')
        }

        var scrollHeight = (this.scrollParent.get(0) == document ? $('body') : this.scrollParent).prop('scrollHeight')
        this.triggerPos = scrollHeight - this.infiniteScrollTriggerPoint
        this.height = (this.scrollParent.get(0) == document ? $(window) : this.scrollParent).outerHeight()
      },

      onScroll: function() {
        if (this.isInfiniteScrollLoading) {
          return
        }

        var viewBottomEdge = this.scrollParent.scrollTop() + this.height

        if (viewBottomEdge > this.triggerPos) {
          this.loadMoreTopics()
        }
      },

      loadMoreTopics: function() {
        this.isInfiniteScrollLoading = true
        this.collection.sync()
      }
    })

})
