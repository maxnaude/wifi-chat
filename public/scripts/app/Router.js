define(function (require) {
  
  'use strict';

  var $                 = require('jquery')
    , Backbone          = require('backbone')
    , WelcomeView       = require('app/views/Welcome')
    , LoginView         = require('app/views/Login')
    , RulesView         = require('app/views/Rules')
    , SignupView        = require('app/views/Signup')
    , PasswordResetView = require('app/views/PasswordReset')
    , NewPasswordView   = require('app/views/NewPassword')
    , LogoutView        = require('app/views/Logout')
    , HomeView          = require('app/views/Home')
    , ModalView         = require('app/views/Modal')
    , ChannelView       = require('app/views/Channel/Index')
    , ProfileView       = require('app/views/Profile')
    , TopicView         = require('app/views/Topic/Index')
    , user              = require('app/store/User')
    , config            = require('app/utils/config')
    , log               = require('bows.min')('Router')
        
    return Backbone.Router.extend({

      el: $('body'),
    
      loggedIn: false, 

      cache: {},
      
      routes: {
        '': 'showHome',
        'welcome': 'showWelcome',
        'login': 'showLogin',
        'signup': 'showSignup',
        'password/reset': 'showPasswordReset',
        'password/reset/:token': 'showNewPassword',
        'rules': 'showRules',
        'profile/:jid': 'showProfile',
        'channel/:jid/:localId/:childId': 'showTopicContext',
        'channel/:jid/:localId': 'showTopic',
        'channel/:jid': 'showChannel',
        'logout': 'showLogout'
      },
      
      initialize: function() {
        log('Application initialized', config.version)
        this.on('all', function(route, parameters) {
          if (0 !== route.indexOf('route:')) {
            return
          }
          var method = route.split(':')[1]
          if ('showLogin' === method) {
            return this.lastRoute = null
          }
          var parameters = Array.prototype.slice.call(arguments, 1)
          this.setLastRoute(route.split(':')[1], parameters)
        }, this)
      },

      setLastRoute: function(method, parameters) {
        this.lastRoute = {
          method: method, parameters: parameters
        }
        return this
      },
      
      showModal: function() {
        var modalView = new ModalView({ router: this })
        this.showView(modalView, '/modal')
      },

      showWelcome: function(options) {
        var welcomeView = new WelcomeView()
        this.showView(welcomeView, '/welcome')
        localStorage.setItem('wasLoggedInOnce', true)
      },
      
      showLogin: function(options) {
        if (!options) {
          options = {}
        }
        var loginView = new LoginView({
          router: this,
          jid: options.jid,
          password: options.password,
          lastRoute: this.lastRoute,
          showRules: options.showRules,
          autoLogin: options.autoLogin
        })
        this.showView(loginView, !options.autoLogin ?'/login' : null)
      },
      
      showRules: function(options) {
        var rulesView = new RulesView({
          router: this,
          hideExtras: (options || {}).hideExtras
        })
        this.showView(rulesView, '/rules')  
      },
      
      showSignup: function() {
        var signupView = new SignupView({ router: this })
        this.showView(signupView, '/signup')
      },

      showPasswordReset: function() {
        var passwordResetView = new PasswordResetView({ router: this })
        this.showView(passwordResetView, '/password/reset')
      },
      
      showNewPassword: function(token) {
        var newPasswordView = new NewPasswordView({ router: this, token: token })
        this.showView(newPasswordView, '/password/reset/' + token)
      },
      
      showHome: function() {
        var homeView = this.cache['homescreen'] || new HomeView({ router: this })
        this.showView(homeView, '')
      },

      showChannel: function(jid) {
        var channelView = this.cache[jid] || new ChannelView({ router: this, channelJid: jid })
        this.showView(channelView, '/channel/' + jid)
      },

      showTopic: function(jid, localId, goToNewComment) {
        if (!localId) {
          return this.showChannel(jid)
        }
        var topicView = this.cache[localId] || new TopicView({
          router: this,
          channelJid: jid,
          localId: localId, 
          goToNewComment: goToNewComment
        })
        this.showView(topicView, '/channel/' + jid + '/' + localId)
      },

      showTopicContext: function(jid, localId, commentId) {
        var topicView = new TopicView({
          router: this,
          channelJid: jid,
          localId: localId, 
          commentId: commentId
        })
        this.showView(topicView, '/channel/' + jid + '/' + localId + '/' + commentId)
      },

      showProfile: function(jid) {
        var profileView = new ProfileView({ router: this, jid: jid })
        this.showView(profileView, '/profile/' + jid)
      },
      
      performLogout: function() {
        localStorage.setItem('wasLoggedInOnce', true)
        var logoutView = new LogoutView({ router: this })
        this.showView(logoutView, '/logout')
      },
      
      showView: function(view, url) {
        this.closeView()

        if (view.requiresLogin && !this.loggedIn) {
          var options = {}
          if (localStorage.getItem('jid')) {
            options.autoLogin = true
          }
          return this.sendToLogin(options)
        }
        window.document.title = 'WiFi Chat - ' + view.title
        if (url) {
          this.navigate(url, { trigger: false })
        }

        this.currentView = view

        if (view.isCached) {
          return this.retreiveView(view)
        }
        this.el.append(view.el)
        view.delegateEvents()

        if (!view.noAutoRender) {
          view.render()
        }
      },
      
      closeView: function() {
        if (!this.currentView) return
        if (this.currentView.cacheable && !this.currentView.isCached) {
          this.cacheView(this.currentView)
        } else {
          this.currentView.closeView()
        }
      },

      retreiveView: function(view) {
        switch (view.type) {
          case 'channel':
            this.clearAllCached('topic')
            break
          case 'homescreen':
            this.clearAllCached('channel')
            break
        }

        view.retrieve()
      },

      clearAllCached: function(type) {
        for (var viewIdentifier in this.cache) {
          if (this.cache[viewIdentifier].type == type) {
            this.removeCachedView(this.cache[viewIdentifier], viewIdentifier)
          }
        }
      },

      removeCachedView: function(view, identifier) {
        view.closeView()
        delete this.cache[identifier]
      },

      destroyCache: function() {
        this.cache = {}
      },

      cacheView: function(view) {
        var key;

        switch (view.type) {
          case 'channel':
            key = view.options.channelJid
            break
          case 'topic':
            key = view.options.localId
            break
          default:
            key = view.type
        }

        this.cache[key] = view
        view.cache()
      },
      
      setLoggedIn: function(jid) {
        this.loggedIn = jid
        var jidString = jid.local + '@' + jid.domain
        var node = [ '/user/', jidString, '/posts' ]
        user.set({
          node: node.join(''),
          channelJid: jidString,
          fullJid: jidString + '/' + jid.resource
        })
        return this
      },
      
      getJid: function() {
        return this.loggedIn
      }, 

      sendToLogin: function(options) {
        if (localStorage.getItem('wasLoggedInOnce')) {
          return this.showLogin(options)
        }
        this.showWelcome()
      },     
      
      isLoggedIn: function() {
        log('User is' + (this.loggedIn ? ' ' : 'n\'t ') + 'logged in')
        if (!this.loggedIn) {
          this.sendToLogin()
        }
        return true
      }
    })

})