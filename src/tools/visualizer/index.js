import React            from 'react';
import Toolbar          from '../../panels/Toolbar';
import * as network     from 'pvw-visualizer/src/network';
import ProxyManager     from 'pvw-visualizer/src/ProxyManager';
import ControlPanel     from 'pvw-visualizer/src/panels/ControlPanel';
import VtkRenderer      from 'paraviewweb/src/React/Renderers/VtkRenderer';
import client           from '../../network';

import style            from 'HPCCloudStyle/PageWithMenu.mcss';
import breadCrumbStyle  from 'HPCCloudStyle/Theme.mcss';
import vizStyle         from 'HPCCloudStyle/Visualizer.mcss';

export default React.createClass({

    displayName: 'Visualization',

    propTypes: {
        location: React.PropTypes.object,
        project: React.PropTypes.object,
        simulation: React.PropTypes.object,
        step: React.PropTypes.string,
        view: React.PropTypes.string,
    },

    contextTypes: {
        router: React.PropTypes.object,
    },

    getInitialState() {
        return {
            menuVisible: true,
            playing: false,
            timeStep: 0,
            timeValues: [],
        };
    },

    componentDidMount() {
        network.onReady(() => {
            this.client = network.getClient();
            this.proxyManager = new ProxyManager(this.client);

            /* eslint-disable */
            this.timeSubcription = this.proxyManager.onTimeChange( (data, envelope) => {
                const { timeStep, timeValues } = data;
                this.setState({ timeStep, timeValues });
            });
            /* eslint-enable */
        });

        //props.simulation is not necessarily updated with latest metadata, so we fetch it.
        client.getSimulationStep(this.props.simulation._id, this.props.step)
           .then((resp) => {
               const config = { sessionURL: `ws://${location.hostname}:8888/proxy?sessionId=${resp.data.metadata.sessionId}` };
               network.connect(config);
           })
           .catch((err) => {
               console.log(err);
           });
    },

    componentWillUnmount() {
        if(this.timeSubcription) {
            this.timeSubcription.unsubscribe();
            this.timeSubcription = null;
        }
    },

    onAction(name) {
        this[name]();
    },

    toggleMenu() {
        this.setState({menuVisible: !this.state.menuVisible});
    },

    resetCamera() {
        if(this.proxyManager) {
            this.proxyManager.resetCamera();
        }
    },

    nextTimeStep() {
        const timeStep = ( this.state.timeStep + 1 ) % this.state.timeValues.length;
        this.proxyManager.setTimeStep(timeStep);
    },

    togglePlay() {
        const playing = !this.state.playing;
        this.setState({playing});
        this.proxyManager[ playing ? 'playTime' : 'stopTime']();
    },

    previousTimeStep() {
        const timeStep = ( this.state.timeStep - 1 + this.state.timeValues.length ) % this.state.timeValues.length;
        this.proxyManager.setTimeStep(timeStep);
    },

    render() {
        if(!this.proxyManager) {
            return null;
        }

        return (
            <div className={ style.rootContainer }>
                <Toolbar
                    breadcrumb={{
                        paths:['/', `/View/Project/${this.props.project._id}`, `/View/Simulation/${this.props.simulation._id}`],
                        icons:[
                            breadCrumbStyle.breadCrumbRootIcon,
                            breadCrumbStyle.breadCrumbProjectIcon,
                            breadCrumbStyle.breadCrumbSimulationIcon,
                        ],
                    }}
                    actions={[
                        { name: 'toggleMenu',  icon: vizStyle.toggleMenuButton },
                        { name: 'nextTimeStep',  icon: vizStyle.nextButton },
                        { name: 'togglePlay',  icon: this.state.playing ? vizStyle.stopButton : vizStyle.playButton },
                        { name: 'previousTimeStep',  icon: vizStyle.previousButton },
                        { name: 'resetCamera', icon: vizStyle.resetCameraButton },
                    ]}
                    onAction={ this.onAction }
                    title={ this.props.simulation.name }/>
                <ControlPanel className={ this.state.menuVisible ? vizStyle.menu : vizStyle.hiddenMenu } proxyManager={ this.proxyManager }/>
                <VtkRenderer { ...this.proxyManager.getNetworkAdapter() } className={ vizStyle.viewport }/>
            </div>);
    },
});
