import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { Base64 } from 'js-base64';
// import logo from './logo.svg';
import './App.css';

let TENANT_FORMAT = null;

class Dialog extends Component {
	show() {
		this.setState({
			show: true
		});
	}
	hide() {
		ReactDOM.unmountComponentAtNode(document.getElementById('dialog'));
	}
}
class SearchDialog extends Dialog {
	state = {};
	componentDidMount() {
		this.refs.k.focus();
	}
	render() {
		const showClass = this.state.show ? 'show' : '';
		return (
			<React.Fragment>
				<div className={`dialog-backdrop ${showClass}`} />
				<div className={`search-dialog ${showClass}`} onClick={this.hide}>
					<input
						type="text"
						ref="k"
						onClick={this.onTextClicked}
						defaultValue={this.props.value}
					/>
					<span
						className="mdi mdi-database-search"
						onClick={this.onSearchClicked}
					/>
				</div>
			</React.Fragment>
		);
	}
	onTextClicked = evt => {
		evt.preventDefault();
		evt.stopPropagation();
	};
	onSearchClicked = evt => {
		evt.preventDefault();
		evt.stopPropagation();
		const value = this.refs.k.value;
		this.props.list.search(value);
		this.hide();
	};
}
class TenantDialog extends Dialog {
	state = {
		props: []
	};
	componentDidMount() {
		this.getTenantFormat().then(format => {
			this.setState({
				props: format
			});
		});
	}
	renderBody() {
		return (
			<div className="dialog-body">
				{this.state.props.map((prop, index) => {
					return (
						<div className="prop" key={index}>
							<span>{prop.label}</span>
							<input
								type={prop.type || 'text'}
								style={prop.style}
								ref={`val-${prop.id}`}
								data-id={prop.id}
								defaultValue={(this.props.tenant || {})[prop.id]}
							/>
							<hr />
						</div>
					);
				})}
			</div>
		);
	}
	render() {
		const showClass = this.state.show ? 'show' : '';
		return (
			<React.Fragment>
				<div className={`dialog-backdrop ${showClass}`} />
				<div className={`tenant-dialog ${showClass}`}>
					{this.renderBody()}
					<div className="dialog-footer">
						<span onClick={this.onCancelClicked}>放弃</span>
						<span onClick={this.onConfirmClicked}>确认</span>
					</div>
				</div>
			</React.Fragment>
		);
	}
	getTenantFormat() {
		if (!TENANT_FORMAT) {
			return fetch(
				'https://api.github.com/repos/eBaoTech/cloud-biz-dev/contents/format.json',
				{
					method: 'GET'
				}
			)
				.then(response => response.json())
				.then(json => {
					return JSON.parse(Base64.decode(json.content.replace('\n', '')));
				})
				.then(json => {
					TENANT_FORMAT = Object.keys(json)
						.reduce((all, key) => {
							json[key].id = key;
							json[key].order =
								json[key].order == null ? 9999 : json[key].order;
							all.push(json[key]);
							return all;
						}, [])
						.sort((a, b) => {
							return a.order - b.order;
						});
					return TENANT_FORMAT;
				});
		} else {
			return Promise.resolve(TENANT_FORMAT);
		}
	}
	onConfirmClicked = evt => {
		const tenant = this.props.tenant || {};
		Object.keys(this.refs)
			.filter(key => {
				return key.startsWith('val-');
			})
			.forEach(key => {
				const value = this.refs[key].value;
				const id = this.refs[key].getAttribute('data-id');
				tenant[id] = value;
			});
		this.props.confirm.call(this, tenant);
		this.hide();
	};
	onCancelClicked = evt => {
		this.hide();
	};
}

class App extends Component {
	state = {
		signed: false,
		u: null,
		p: null,
		tenants: [],
		searchText: null
	};
	renderSign() {
		let className = 'Sign';
		if (this.state.signed) {
			className += ' Signed';
		}
		return (
			<div className={className}>
				<div>用户名:</div>
				<div>
					<input type="text" ref="u" />
				</div>
				<div>密码:</div>
				<div>
					<input type="password" ref="p" />
				</div>
				<div className="Sign-btn">
					<input type="button" value="登录" onClick={this.onSigninClicked} />
				</div>
			</div>
		);
	}
	renderTenants() {
		if (!this.state.signed) {
			return;
		}
		return (
			<React.Fragment>
				<div className="Add-Tenants">
					<input type="button" value="添加" onClick={this.onAddClicked} />
					<input type="button" value="搜索" onClick={this.onSearchClicked} />
				</div>
				<div className="Tenants">
					{this.state.tenants
						.filter(tenant => {
							if (
								this.state.searchText == null ||
								this.state.searchText.trim().length === 0
							) {
								return true;
							} else {
								return Object.keys(tenant).some(key => {
									const value = tenant[key];
									return (
										value != null &&
										(value + '').indexOf(this.state.searchText) !== -1
									);
								});
							}
						})
						.map((tenant, index) => {
							return (
								<div
									className="Tenant"
									key={index}
									onClick={this.onEditClicked.bind(this, tenant)}
								>
									<span>#{index}</span>
									<span>{tenant.name}</span>
									<span>{tenant.contact}</span>
								</div>
							);
						})}
				</div>
			</React.Fragment>
		);
	}
	render() {
		return (
			<React.Fragment>
				<div className="App">
					<header className="App-header">
						{/* <img src={logo} className="App-logo" alt="logo" /> */}
						<h1 className="App-title">Nerd Save The World!</h1>
					</header>
				</div>
				{this.renderSign()}
				{this.renderTenants()}
			</React.Fragment>
		);
	}
	onSigninClicked = () => {
		this.setState(
			{
				u: this.refs.u.value,
				p: this.refs.p.value
			},
			() => {
				this.fetchData();
			}
		);
	};
	onAddClicked = () => {
		ReactDOM.render(
			<TenantDialog confirm={this.onAdded} />,
			document.getElementById('dialog')
		);
	};
	onAdded = tenant => {
		this.state.tenants.push(tenant);
		this.postData();
		this.forceUpdate();
	};
	onEditClicked(tenant) {
		ReactDOM.render(
			<TenantDialog confirm={this.onEdited} tenant={tenant} />,
			document.getElementById('dialog')
		);
	}
	onEdited = tenant => {
		this.postData();
		this.forceUpdate();
	};
	onSearchClicked = () => {
		ReactDOM.render(
			<SearchDialog list={this} value={this.state.searchText} />,
			document.getElementById('dialog')
		);
	};
	postData() {
		const content = Base64.encode(
			JSON.stringify(
				this.state.tenants.map(tenant => {
					return Object.keys(tenant).reduce((obj, prop) => {
						if (tenant[prop] != null && tenant[prop].trim() !== '') {
							obj[prop] = tenant[prop];
						}
						return obj;
					}, {});
				})
			)
		);
		fetch(
			'https://api.github.com/repos/eBaoTech/cloud-biz-dev/contents/tenants.txt',
			{
				method: 'PUT',
				headers: {
					Authorization: this.getAuthorization(),
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					message: 'some changes',
					content: content,
					sha: this.state.sha
				})
			}
		)
			.then(response => response.json())
			.then(json => {
				this.setState({
					sha: json.content.sha
				});
			});
	}
	fetchData() {
		fetch(
			'https://api.github.com/repos/eBaoTech/cloud-biz-dev/contents/tenants.txt',
			{
				method: 'GET'
			}
		)
			.then(response => response.json())
			.then(json => {
				this.setState({
					signed: true,
					tenants: JSON.parse(Base64.decode(json.content.replace('\n', ''))),
					sha: json.sha
				});
			});
	}
	getAuthorization() {
		return 'Basic ' + btoa(`${this.state.u}:${this.state.p}`);
	}
	search(value) {
		this.setState({
			searchText: value
		});
	}
}

export default App;
