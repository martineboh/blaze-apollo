import { Template } from 'meteor/templating';
import { Tracker } from 'meteor/tracker';
import { Result } from './result';

// TODO: can this be imported with an import statement?
const { TemplateInstance } = Blaze;

function initTemplateQueries(template) {
  if (!template._gqlQueries) {
    // eslint-disable-next-line no-param-reassign
    template._gqlQueries = {};
    // eslint-disable-next-line no-param-reassign
    template._gqlQueriesDep = new Tracker.Dependency();

    template.view.onViewDestroyed(() => {
      Object.keys(template._gqlQueries).forEach(key => template._gqlQueries[key].unsubscribe());
    });
  }
}

export function setup({ client } = {}) {
  TemplateInstance.prototype.gqlQuery = function gqlQuery(request, { equals } = {}) {
    initTemplateQueries(this);

        // Generate a unique key for every request
        // If a template does the same request twice, it will only query once
        // For now a JSON stringify seems good enough
    const key = JSON.stringify(request);

    if (!this._gqlQueries[key]) {
      this._gqlQueries[key] = new Result({
        observer: client.watchQuery(request),
        equals,
      });
      this._gqlQueriesDep.changed();
    }

    return this._gqlQueries[key];
  };

  TemplateInstance.prototype.queriesReady = function queriesReady() {
    initTemplateQueries(this);

    this._gqlQueriesDep.depend();

    return Object.keys(this._gqlQueries).every(key => this._gqlQueries[key].isReady());
  };

  TemplateInstance.prototype.gqlMutate = function gqlMutate(request) {
    return client.mutate(request);
  };

  Template.registerHelper('queriesReady', () => Template.instance().queriesReady());
}

export function breakdown() {
  delete TemplateInstance.prototype.gqlQuery;
  delete TemplateInstance.prototype.gqlMutate;
  delete TemplateInstance.prototype.queriesReady;

  Template.deregisterHelper('queriesReady');
}
