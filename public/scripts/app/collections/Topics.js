define(function(require) {

  'use strict';
  
  var Backbone = require('backbone')
    , Post     = require('app/models/Post')
    , log      = require('app/utils/bows.min')('Collections:Topics')
    , socket   = require('app/utils/socket')
    , pusher   = require('app/store/Pusher')
    
  return Backbone.Collection.extend({
    
    model: Post,

    lastTopicId: null,
    topicsPerRequest: 15,
    topicCount: null,
    
    event: 'xmpp.buddycloud.retrieve',

    comparator: function(model) {
      return -1.0 * model.get('published')
    },

    initialize: function(models, options) {
      this.options = options
      this.options.node = '/user/' + options.channelJid + '/posts'
      pusher.on('new-post', this.pushedItem, this)
      pusher.on('delete-post', this.retractItem, this)
    },
    
    sync: function(method, collection, options) {
      if (!method) {
        method = 'get'
      }
      
      switch (method) {
        case 'get':
          return this.getThreads()
        default:
          throw new Error('Unhandled method')
      }
          
    },

    allItemsLoaded: function() {
      return (this.topicCount && (this.models.length === this.topicCount))
    },
    
    getThreads: function() {
      if (0 !== this.models.length) {
        /* No reload */
        return
      }
      var self = this
      var options = {
        node: this.options.node,
        parentOnly: true,
        rsm: {
          max: this.topicsPerRequest
        }
      }
      if (this.lastTopicId) {
        options.rsm.before = this.lastTopicId
        options.rsm.max = this.topicsPerRequest + 1
      }
      socket.send(this.event, options, function(error, data, rsm) {
        if (error) {
          return self.trigger('error', error)
        }
        log('Received topics', data.length)
        self.topicCount = rsm.count
        self.add(data)
        if (0 !== data.length) {
          self.lastTopicId = rsm.first
        }
        self.trigger('loaded:topics')
      })
    },

    pushedItem: function(model) {
      if (model.get('node') !== this.options.node) {
        return
      }
      // If post is a new thread drop into the collection
      var inReplyTo = model.get('inReplyTo')

      if (!inReplyTo) {
        return this.add(model)
      }
      // If post is a reply, update the comment count
      var parentPost = this.findWhere({ localId: inReplyTo })
      if (parentPost) {
        parentPost.addComment()
      }
    },

    retractItem: function(data) {
      if (data.node !== this.options.node) {
        return
      }
      // If post is a new thread drop into the collection
      var model = this.findWhere({ node: data.node, localId: data.id })
      if (model) {
        this.remove(model)
      }
    }
    
  })
    
})