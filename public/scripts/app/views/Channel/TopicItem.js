define(function(require) {

    'use strict';

    var _              = require('underscore')
      , Base           = require('app/views/Base')
      , Avatars        = require('app/store/Avatars')
      , subscriptions  = require('app/store/Subscriptions')
      , log            = require('bows.min')('Views:TopicItem')
      , channels       = require('app/store/Channels')
      , Channel        = require('app/models/Channel')
    require('jquery.timeago')

    return Base.extend({

        template: _.template(require('text!tpl/Channel/TopicItem.html')),
      
        requiresLogin: true,

        tagName: 'section',

        className: 'post post--topic',

        events: {
          'click .js-seeAuthor': 'seeAuthor',
          'click .js-comment': 'addComment',
        },

        postingAffiliations: [
          'publisher',
          'moderator',
          'owner'
        ],

        initialize: function(options) {
          this.options = options
          this.model.bind('change:displayName', this.renderDisplayName, this)
          this.model.bind('change:commentCount', this.renderCommentCount, this)

          this.determineCommentAbility()
          this.avatar = Avatars.getAvatar({ jid: this.model.get('authorJid') })
          this.avatar.on('change:url', this.renderAvatar, this)
        },

        determineCommentAbility: function() {
          var subscription = subscriptions.findWhere({ node: this.model.get('node')})
          var canComment = true
          if (-1 === this.postingAffiliations.indexOf(subscription.get('affiliation'))) {
            canComment = false
          }
          this.model.set('canComment', canComment, { silent: true })
        },

        render: function(){
          this.$el.html(this.template(_.extend(this.model.attributes, {
            avatarUrl: this.avatar.getUrl()
          })))

          this.loadDisplayName()
          this.$el.find('time').timeago()

          return this
        },

        loadDisplayName: function() {
          if (this.model.get('displayName')) {
            return
          }
          var authorNode = '/user/' + this.model.get('authorJid') + '/posts'
          channels.getChannel(authorNode, this, 'loadDisplayName')
        },

        renderDisplayName: function() {
          this.$el.find('.js-displayName').text( this.model.get('displayName') )
        },

        renderCommentCount: function() {
          this.$el.find('.js-commentCount').text( this.model.get('commentCount') )
        },

        addComment: function() {
          // view topic and focus on new comment input
          this.options.router.showTopic(this.model.get('channelJid'), this.model.get('localId'), true)
        },

        seeAuthor: function() {
          this.options.router.showProfile(this.model.get('authorJid'))
        },

        renderAvatar: function() {
          this.$el.find('.avatar')
            .css('background-image', 'url("' + this.avatar.getUrl() + '")')      
        },
      
    })

})
