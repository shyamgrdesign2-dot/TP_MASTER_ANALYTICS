import { useNavigate, useSearchParams } from 'react-router-dom'
import "./OurOffering.scss"
import { useLocalStorage } from '../../utils/localStorage'
import { PERSISTANT_STORAGE_KEY_AUTH_TOKEN, PERSISTANT_STORAGE_KEY_MEDECO_TOKEN } from '../../utils/constants'
import config from '../../config'
import { useSelector } from 'react-redux'
import { ASSETS } from "../../assets";
const ShethoscopeImg = ASSETS.images.offerings.shethoscope;
const TatvaShotsImg = ASSETS.images.offerings.tatvashots;
const TatvaPediaImg = ASSETS.images.offerings.tatvapedia;
const RemoteCareImg = ASSETS.images.offerings.remoteCare;
const AskTatvaImg = ASSETS.images.offerings.askTatva;
const GenerateDDxImg = ASSETS.images.offerings.ddx;
const WhiteGridImg = ASSETS.images.offerings.whiteGrid;
const TatvaCareLogo = ASSETS.images.tatvacare;

const OurOffering = () => {
    const [searchParams] = useSearchParams();
    const name = searchParams.get("name");
    const { profile } = useSelector((state) => state.doctors);
    const formattedName = name?.replace(/^Dr\s+|^dr\s+/i, '') || (profile?.um_name?.split(/\s+/).filter(word => (word.toLowerCase() !== "dr" && word.toLowerCase() !== "dr.")).join(' '));
    const mobileNumberRaw = searchParams.get("mobileNumber");
    // Remove '91' from the start of the mobile number if present
    const mobileNumber = mobileNumberRaw ? mobileNumberRaw.replace(/^91/, '') : '';
    console.log('mobileNumber', mobileNumber)
    const from = searchParams.get("from")
    const speciality = searchParams.get("speciality");
    const [getMedecoToken, setMedecoToken] = useLocalStorage(
        PERSISTANT_STORAGE_KEY_MEDECO_TOKEN
    );
    const [getPracticeToken, setPracticeToken] = useLocalStorage(
        PERSISTANT_STORAGE_KEY_AUTH_TOKEN
    );
    const navigate = useNavigate()
    const CardData = [
        {
            title: "TatvaPractice",
            image: ShethoscopeImg,
            key: "tatva_practice"
        },
        {
            title: "TatvaShots",
            image: TatvaShotsImg,
            key: "tatva_shots"
        },
        {
            title: "TatvaPedia",
            image: TatvaPediaImg,
            key: "tatva_pedia"
        },
        {
            title: "Remote Care",
            image: RemoteCareImg,
            key: "remote_care"
        },
        {
            title: "Ask Tatva",
            image: AskTatvaImg,
            key: "ask_tatva"
        },
        {
            title: "Generative DDx",
            image: GenerateDDxImg,
            key: "generate_ddx"
        },
    ]
    const handleOfferingClick = (key) => {
        const medecoToken = getMedecoToken();
        const practiceToken = getPracticeToken();
        const MEDECO_WEBVIEW_URL = config.MEDECO_WEBVIEW_URL

        console.log('Offering Click:', {
            key,
            medecoToken: !!medecoToken,
            practiceToken: !!practiceToken,
            MEDECO_WEBVIEW_URL,
            configObject: config,
            env: process.env.REACT_APP_ENV
        });
        switch (key) {
            case "tatva_practice":
                if (from === "home") {
                    navigate("/");
                } else {
                    localStorage.setItem("mobileNumber", mobileNumber);
                    navigate(`/final-setup?fullName=${formattedName}&speciality=${speciality}&fromOffering=true`);
                }
                break;
            case "tatva_shots":
                window.location.href = `${MEDECO_WEBVIEW_URL}/tatva-shots?authToken=${medecoToken}&practiceToken=${practiceToken}&fromPractice=${true}`;
                break;
            case "remote_care":
                window.location.href = `${MEDECO_WEBVIEW_URL}/remote-care?authToken=${medecoToken}&practiceToken=${practiceToken}&fromPractice=${true}`
                break;
            case "generate_ddx":
                window.location.href = `${MEDECO_WEBVIEW_URL}/ddx-welcome?authToken=${medecoToken}&practiceToken=${practiceToken}&fromPractice=${true}`;
                break;
            case "ask_tatva":
                window.location.href = `${MEDECO_WEBVIEW_URL}/tatva-ai?authToken=${medecoToken}&practiceToken=${practiceToken}&fromPractice=${true}`;
                break;
            case "tatva_pedia":
                window.location.href = `${MEDECO_WEBVIEW_URL}/tatvapedia?authToken=${medecoToken}&practiceToken=${practiceToken}&fromPractice=${true}`;
                break;
            default:
                break;
        }
    }
    return (
        <div className='medeco'>
            {/* Header */}
            <div className='medeco_header'>
                <img src={TatvaCareLogo} className='tatva_care_logo' />
            </div>
            <div className='medeco_container'>
                <div className='gradient_container'>
                    <img src={WhiteGridImg} className='header_white_grid' />
                </div>
                <div className='data_container'>
                    <div>
                        <p className='doctor_name'>Welcome Dr. {formattedName}!</p>
                        <p className='sub_text'>Seamlessly access your practice tools all in one place.</p>
                    </div>
                    <div className='offering_container'>
                        <div className='offering_text_container'>
                            <p className='offering_text'>Our Offerings </p>
                            <p className='offering_subtext'>We offers a whole host of services that will assist you in your practice journey</p>
                        </div>
                        <div className='offering_cards_container'>
                            {CardData.map(card => (
                                <div className='offering_container_card' onClick={() => handleOfferingClick(card.key)} >
                                    <img src={WhiteGridImg} className='card_white_grid' />
                                    <img src={card.image} className='card_img' />
                                    <p className='card_title'>{card.title}</p>
                                </div>
                            ))}
                        </div>
                        {/* <div className='qr_container'>
                            <div className='qr_content'>
                                <p className='qr_heading'>Scan QR to Download MedEco Mobile App</p>
                                <p>Download the MedEco Mobile App to manage your practice on the go, access real-time medical insights, and deliver better patient care anytime, anywhere. <span className='qr_know_more'>Know More</span></p>
                            </div>
                            <div className='qr_img_container'>
                                <img src={QrImg} className='qr_img' />
                            </div>
                        </div> */}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default OurOffering