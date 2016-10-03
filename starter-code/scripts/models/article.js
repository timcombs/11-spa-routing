(function(module) {
  function Article (opts) {
    Object.keys(opts).forEach(function(element) {
      this[element] = opts[element];
    }, this);
  }

  Article.allArticles = [];

  Article.prototype.toHtml = function(scriptTemplateId) {
    var template = Handlebars.compile($(scriptTemplateId).text());
    this.daysAgo = parseInt((new Date() - new Date(this.publishedOn))/60/60/24/1000);
    this.publishStatus = this.publishedOn ? 'published ' + this.daysAgo + ' days ago' : '(draft)';
    this.body = marked(this.body);
    return template(this);
  };

  Article.createTable = function() {
    webDB.execute(
      'CREATE TABLE IF NOT EXISTS articles (' +
        'id INTEGER PRIMARY KEY, ' +
        'title VARCHAR(255) NOT NULL, ' +
        'author VARCHAR(255) NOT NULL, ' +
        'authorUrl VARCHAR (255), ' +
        'category VARCHAR(20), ' +
        'publishedOn DATETIME, ' +
        'body TEXT NOT NULL);',
      function() {
        console.log('Successfully set up the articles table.');
      }
    );
  };

  Article.truncateTable = function() {
    webDB.execute(
      'DELETE FROM articles;'
    );
  };

  Article.prototype.insertRecord = function() {
    webDB.execute(
      [
        {
          'sql': 'INSERT INTO articles (title, author, authorUrl, category, publishedOn, body) VALUES (?, ?, ?, ?, ?, ?);',
          'data': [this.title, this.author, this.authorUrl, this.category, this.publishedOn, this.body],
        }
      ]
    );
  };

  Article.prototype.deleteRecord = function() {
    webDB.execute(
      [
        {
          'sql': 'DELETE FROM articles WHERE id = ?;',
          'data': [this.id]
        }
      ]
    );
  };

  Article.prototype.updateRecord = function() {
    webDB.execute(
      [
        {
          'sql': 'UPDATE articles SET title = ?, author = ?, authorUrl = ?, category = ?, publishedOn = ?, body = ? WHERE id = ?;',
          'data': [this.title, this.author, this.authorUrl, this.category, this.publishedOn, this.body, this.id]
        }
      ]
    );
  };

  Article.loadAll = function(rows) {
    Article.allArticles = rows.map(function(ele) {
      return new Article(ele);
    });
  };

  Article.fetchAll = function(next) {
    webDB.execute('SELECT * FROM articles ORDER BY publishedOn DESC', function(rows) {
      if (rows.length) {
        Article.loadAll(rows);
        next();
      } else {
        $.getJSON('/data/hackerIpsum.json', function(rawData) {
          rawData.forEach(function(item) {
            var article = new Article(item);
            article.insertRecord();
          });
          webDB.execute('SELECT * FROM articles ORDER BY publishedOn DESC', function(rows) {
            Article.loadAll(rows);
            next();
          });
        });
      }
    });
  };

  Article.allAuthors = function() {
    return Article.allArticles.map(function(article) {
      return article.author;
    })
    .reduce(function(names, name) {
      if (names.indexOf(name) === -1) {
        names.push(name);
      }
      return names;
    }, []);
  };

  Article.numWordsAll = function() {
    return Article.allArticles.map(function(article) {
      return article.body.match(/\w+/g).length;
    })
    .reduce(function(a, b) {
      return a + b;
    });
  };

  Article.numWordsByAuthor = function() {
    return Article.allAuthors().map(function(author) {
      return {
        name: author,
        numWords: Article.allArticles.filter(function(a) {
          return a.author === author;
        })
        .map(function(a) {
          return a.body.match(/\w+/g).length;
        })
        .reduce(function(a, b) {
          return a + b;
        })
      };
    });
  };
  Article.createTable();
  module.Article = Article;
})(window);
