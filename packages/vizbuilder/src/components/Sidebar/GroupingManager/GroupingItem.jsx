import {Button} from "@blueprintjs/core";
import PropTypes from "prop-types";
import React from "react";

import {fetchMembers} from "../../../helpers/fetch";
import {composePropertyName} from "../../../helpers/formatting";

import LevelSelect from "../LevelSelect";
import MemberSelect from "../MemberSelect";
import SidebarCRUDItem from "../SidebarCRUDItem";

import Grouping from "./Grouping";

/**
 * @augments React.Component<IProps,IState>
 */
class GroupingItem extends SidebarCRUDItem {
  constructor(props) {
    super(props);

    const item = props.item;

    this.state = {
      isOpen: !item.level,
      loading: true,
      members: [],
      newItem: !item.level ? item.setLevel(props.options[0]) : null
    };

    this.handleUpdateLevel = this.handleUpdateLevel.bind(this);
    this.handleAddMember = this.handleUpdate.bind(this, "addMember");
    this.handleRemoveMember = this.handleUpdate.bind(this, "removeMember");
  }

  componentDidMount() {
    const activeItem = this.state.newItem || this.props.item;
    this.handleUpdateLevel(activeItem.level);
  }

  render() {
    return this.state.isOpen
      ? this.renderEditable.call(this)
      : this.renderClosed.call(this);
  }

  renderClosed() {
    const {item} = this.props;
    return (
      <div className="grouping-item">
        <div className="group values">
          <div className="grouping-name">{composePropertyName(item.level)}</div>
          {item.hasMembers && (
            <div className="group grouping-members">
              {item.members.map(member => (
                <span key={member.key}>{member.name}</span>
                ))}
            </div>
          )}
        </div>
        <div className="group actions">
          <Button
            text="Delete"
            className="pt-small"
            onClick={this.handleDelete}
          />
          <Button
            text={"Edit params"}
            className="pt-small pt-intent-primary"
            onClick={this.handleEdit}
          />
        </div>
      </div>
    );
  }

  renderEditable() {
    const {item, options} = this.props;
    const {loading, members, newItem} = this.state;
    const activeItem = newItem || item;
    return (
      <div className="grouping-item editing">
        <div className="group grouping-level">
          <LevelSelect
            className="custom-select"
            items={options}
            value={activeItem.level}
            onItemSelect={this.handleUpdateLevel}
          />
        </div>
        <div className="group grouping-members">
          <MemberSelect
            loading={loading}
            className="custom-select"
            items={members}
            selectedItems={activeItem.members}
            onItemSelect={this.handleAddMember}
            onItemRemove={this.handleRemoveMember}
          />
        </div>
        <div className="group actions">
          <Button
            text={item.level ? "Reset" : "Delete"}
            className="pt-small"
            onClick={item.level ? this.handleClose : this.handleDelete}
          />
          <Button
            text="Apply changes"
            className="pt-small pt-intent-primary"
            onClick={this.handleApply}
          />
        </div>
      </div>
    );
  }

  handleUpdateLevel(level) {
    if (!level) return;
    const activeItem = this.state.newItem || this.props.item;
    const newItem = activeItem.setLevel(level);
    this.setState({loading: true, members: [], newItem}, () =>
      fetchMembers(level).then(members =>
        this.setState({loading: false, members})
      )
    );
  }
}

GroupingItem.propTypes = {
  item: PropTypes.instanceOf(Grouping),
  onDelete: PropTypes.func,
  onUpdate: PropTypes.func,
  options: PropTypes.array
};

/**
 * @typedef IProps
 * @prop {Grouping} item
 * @prop {(grouping: Grouping) => void} onDelete
 * @prop {(grouping: Grouping) => void} onUpdate
 * @prop {Level[]} options
 */

/**
 * @typedef IState
 * @prop {boolean} isOpen
 * @prop {boolean} loading
 * @prop {Member[]} members
 * @prop {Grouping} newItem
 */

export default GroupingItem;
