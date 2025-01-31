import axios from "axios";
import React, {Component} from "react";
import {Dialog} from "@blueprintjs/core";
import varSwapRecursive from "../../utils/varSwapRecursive";
import Loading from "components/Loading";
import FooterButtons from "../FooterButtons";
import TextEditor from "../editors/TextEditor";
import PlainTextEditor from "../editors/PlainTextEditor";
import deepClone from "../../utils/deepClone";
import PropTypes from "prop-types";
import LocaleName from "./LocaleName";
import CardWrapper from "./CardWrapper";
import "./TextCard.css";

class TextCard extends Component {

  constructor(props) {
    super(props);
    this.state = {
      minData: null,
      displayData: null,
      initialData: null,
      alertObj: false,
      isDirty: false
    };
  }

  componentDidMount() {
    this.hitDB.bind(this)();
  }

  componentDidUpdate(prevProps) {
    if (this.state.minData && (JSON.stringify(prevProps.variables) !== JSON.stringify(this.props.variables) || JSON.stringify(this.props.selectors) !== JSON.stringify(prevProps.selectors))) {
      this.formatDisplay.bind(this)();
    }
    if (prevProps.item.id !== this.props.item.id || prevProps.locale !== this.props.locale) {
      this.hitDB.bind(this)();
    }
  }

  populateLanguageContent(minData) {
    const {locale, localeDefault, fields, plainfields} = this.props;
    if (!minData.content.find(c => c.lang === locale)) {
      const defCon = minData.content.find(c => c.lang === localeDefault);
      const newCon = {id: minData.id, lang: locale};
      if (defCon) {
        Object.keys(defCon).forEach(k => {
          if (k !== "id" && k !== "lang") newCon[k] = defCon[k];
        });
      }
      // If for any reason the default was missing fields, fill the rest with blanks
      fields.forEach(k => !newCon[k] ? newCon[k] = "" : null);
      if (plainfields) plainfields.forEach(k => !newCon[k] ? newCon[k] = "" : null);
      minData.content.push(newCon);
    }
    return minData;
  }

  markAsDirty() {
    const {isDirty} = this.state;
    if (!isDirty) this.setState({isDirty: true});
  }

  hitDB() {
    const {item, type} = this.props;
    const {id} = item;
    axios.get(`/api/cms/${type}/get/${id}`).then(resp => {
      const minData = this.populateLanguageContent.bind(this)(resp.data);
      this.setState({minData}, this.formatDisplay.bind(this));
    });
  }

  formatDisplay() {
    const {variables, selectors, locale} = this.props;
    const formatters = this.context.formatters[locale];

    const minData = this.populateLanguageContent.bind(this)(this.state.minData);
    // Setting "selectors" here is pretty hacky. The varSwap needs selectors in order
    // to run, and it expects them INSIDE the object. Find a better way to do this without
    // polluting the object itself
    minData.selectors = selectors;
    // Swap vars, and extract the actual (multilingual) content
    const content = varSwapRecursive(minData, formatters, variables).content;
    const currLang = content.find(c => c.lang === locale);
    // Map over each of the default keys, and fetch its equivalent locale version (or default)
    const displayData = {};
    Object.keys(currLang).forEach(k => {
      displayData[k] = currLang[k];
    });
    this.setState({displayData});
  }

  save() {
    const {type, fields, plainfields, locale, localeDefault} = this.props;
    const {minData} = this.state;
    const payload = {id: minData.id};
    const thisLocale = minData.content.find(c => c.lang === locale);
    // For some reason, an empty quill editor reports its contents as <p><br></p>. Do not save
    // this to the database - save an empty string instead.
    fields.forEach(field => thisLocale[field] = thisLocale[field] === "<p><br></p>" ? "" : thisLocale[field]);
    if (plainfields) plainfields.forEach(field => thisLocale[field] = thisLocale[field] === "<p><br></p>" ? "" : thisLocale[field]);
    payload.allowed = minData.allowed;
    payload.content = [thisLocale];
    axios.post(`/api/cms/${type}/update`, payload).then(resp => {
      if (resp.status === 200) {
        this.setState({isOpen: false, isDirty: false}, this.formatDisplay.bind(this));
        // Only broadcast the title update out to the tree if we are updating the default locale
        if (locale === localeDefault && this.props.onSave) this.props.onSave(minData);
      }
    });
  }

  maybeDelete() {
    const alertObj = {
      callback: this.delete.bind(this),
      message: "Are you sure you want to delete this?",
      confirm: "Delete"
    };
    this.setState({alertObj});
  }

  delete() {
    const {type} = this.props;
    const {minData} = this.state;
    axios.delete(`/api/cms/${type}/delete`, {params: {id: minData.id}}).then(resp => {
      if (resp.status === 200) {
        this.setState({isOpen: false});
        if (this.props.onDelete) this.props.onDelete(type, resp.data);
      }
    });
  }

  openEditor() {
    const {minData} = this.state;
    const initialData = deepClone(minData);
    const isOpen = true;
    this.setState({initialData, isOpen});
  }

  maybeCloseEditorWithoutSaving() {
    const {isDirty} = this.state;
    if (isDirty) {
      const alertObj = {
        callback: this.closeEditorWithoutSaving.bind(this),
        message: "Are you sure you want to abandon changes?",
        confirm: "Yes, Abandon changes."
      };
      this.setState({alertObj});
    }
    else {
      this.closeEditorWithoutSaving.bind(this)();
    }
  }

  closeEditorWithoutSaving() {
    const {initialData} = this.state;
    const minData = deepClone(initialData);
    const isOpen = false;
    const alertObj = false;
    const isDirty = false;
    this.setState({minData, isOpen, alertObj, isDirty});
  }

  upperCaseFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  prettifyType(type) {
    return this.upperCaseFirst(type
      .replace("story_", "")
      .replace("topic_", "")
    );
  }

  render() {
    const {alertObj, displayData, minData, isOpen} = this.state;
    const {variables, fields, onMove, plainfields, type, parentArray, item, locale} = this.props;

    if (!minData || !displayData) return <Loading />;

    let cardClass = "splash-card";
    if (["profile_stat", "topic_stat"].includes(type)) cardClass = "cms-stat-card";
    const displaySort = ["title", "value", "subtitle", "description"];
    const displays = Object.keys(displayData)
      .filter(k => typeof displayData[k] === "string" && !["id", "lang", "image", "profile_id", "allowed", "date", "ordering", "slug", "label", "type"].includes(k))
      .sort((a, b) => displaySort.indexOf(a) - displaySort.indexOf(b));

    // define props for CardWrapper
    const cardProps = {
      cardClass,
      title: <LocaleName locale={locale} />,
      onEdit: this.openEditor.bind(this),
      // reorder
      reorderProps: parentArray ? {
        array: parentArray,
        item,
        type
      } : null,
      onReorder: onMove ? onMove.bind(this) : null,
      // alert
      alertObj,
      onAlertCancel: () => this.setState({alertObj: false})
    };

    return (
      <CardWrapper {...cardProps}>

        {/* preview content */}
        { displays.map((k, i) =>
          <p key={i} className={k} dangerouslySetInnerHTML={{__html: displayData[k]}} />
        )}

        {/* edit content */}
        <Dialog
          isOpen={isOpen}
          onClose={this.maybeCloseEditorWithoutSaving.bind(this)}
          title={type ? `${this.prettifyType(type)} editor` : "Text editor"}
          usePortal={false}
        >
          <div className="bp3-dialog-body">
            {plainfields && <PlainTextEditor markAsDirty={this.markAsDirty.bind(this)} data={minData} locale={locale} fields={plainfields} />}
            {fields && <TextEditor markAsDirty={this.markAsDirty.bind(this)} data={minData} locale={locale} variables={variables} fields={fields.sort((a, b) => displaySort.indexOf(a) - displaySort.indexOf(b))} />}
          </div>
          <FooterButtons
            onDelete={["profile", "section", "topic", "story", "storytopic"].includes(type) ? false : this.maybeDelete.bind(this)}
            onSave={this.save.bind(this)}
          />
        </Dialog>
      </CardWrapper>
    );
  }
}

TextCard.contextTypes = {
  formatters: PropTypes.object
};

export default TextCard;
