import React, { useState, useContext, useCallback } from 'react';
import { Form, Input, Button } from 'antd';
import { useSelector, useDispatch } from "react-redux";
import LanguageMoreModal from './LanguageMoreModal';

import DoctorWebsiteSettingsContext from '../../context/DoctorWebsiteSettingsContext';
import { doctorOpenAI } from "../../redux/doctorWebsiteSlice";
import { blockedEmoji, errorMessage, onlyNumberFormat } from '../../utils/utils';

function DWAboutDoctor() {

    const { personalDetails, clinicProfile, aboutDoctor, doctorExperience, services, educationTraining, rewardRecognition, setAboutDoctor } = useContext(DoctorWebsiteSettingsContext);

    const dispatch = useDispatch();
    const { languageList, ai_loading } = useSelector((state) => state.doctorWebsite);

    const [languageMoreOptionsVisible, setLanguageMoreOptionsVisible] = useState(false);

    const handleLanguageMoreOptionsVisible = useCallback(
        () => {
            setLanguageMoreOptionsVisible(!languageMoreOptionsVisible)
        },
        [languageMoreOptionsVisible]
    );

    const onChangeInput = useCallback(
        (e, key) => {
            if (key === 'years_experience') {
                if (e.target.value.length < 4 && (!e.target.value || parseInt(e.target.value) <= 100)) {
                    aboutDoctor[key] = onlyNumberFormat(e.target.value);
                }
            } else {
                aboutDoctor[key] = blockedEmoji(e.target.value);
            }
            setAboutDoctor((prev) => { return { ...prev } });
        },
        [aboutDoctor]
    );

    const decrement = useCallback(
        () => {
            if (!aboutDoctor?.years_experience || parseInt(aboutDoctor?.years_experience) > 0) {
                setAboutDoctor((prev) => { return { ...prev, years_experience: prev?.years_experience ? parseInt(prev?.years_experience) - 1 : 1 } });
            }
        },
        [aboutDoctor]
    );
    const increment = useCallback(
        () => {
            if (!aboutDoctor?.years_experience || parseInt(aboutDoctor?.years_experience) < 100) {
                setAboutDoctor((prev) => { return { ...prev, years_experience: prev?.years_experience ? parseInt(prev?.years_experience) + 1 : 1 } });
            }
        },
        [aboutDoctor]
    );

    const onLanguageClick = useCallback(
        (e) => {
            var data = aboutDoctor.hasOwnProperty('language') ? [...aboutDoctor?.language] : []
            if (data.includes(e)) {
                const index = data.indexOf(e);
                if (index > -1) {
                    data.splice(index, 1);
                }
                aboutDoctor.language = [...data];
            } else {
                data.push(e)
                aboutDoctor.language = [...data];
            }
            setAboutDoctor((prev) => { return { ...prev } });
        },
        [aboutDoctor]
    );

    const getAIdata = async () => {
        var contain = `You are a marketing expert tasked with writing an “About Me” profile section for a doctor. Use the following details to create a comprehensive and engaging profile. Ensure that you stay within the bounds of the provided information and maintain a professional yet approachable tone. Dr. ${personalDetails?.first_name} is a highly skilled ${personalDetails?.specialty} with over ${aboutDoctor?.years_experience} years of experience in the medical field.`

        if (educationTraining?.length > 0) {
            contain = contain + ` Graduating from ${educationTraining[0].title} in ${educationTraining[0].start_year} to ${educationTraining[0].end_year},`
        }
        if (rewardRecognition?.length > 0) {
            contain = contain + ` Dr. ${personalDetails?.first_name} has earned numerous certifications, including (${rewardRecognition?.map(e => e.title).join(", ")}).`
        }
        if (rewardRecognition?.length > 0) {
            contain = contain + ` Dr. ${personalDetails?.first_name} has earned numerous certifications, including (${rewardRecognition?.map(e => e.title).join(", ")}).`
        }
        if (doctorExperience?.filter(e => e.currently_working)?.length > 0) {
            contain = contain + ` Currently, Dr. ${personalDetails?.first_name} serves as ${doctorExperience?.filter(e => e.currently_working)[0].title} at ${doctorExperience?.filter(e => e.currently_working)[0].hospital}, where they specialize in [Areas of Expertise].`
        }
        if (services?.length > 0) {
            contain = contain + ` Outside of the clinic, Dr. ${personalDetails?.first_name} enjoys (${services?.map(e => e.title).join(", ")}), which helps them maintain a well-rounded and balanced life.`
        }

        var sendData = {
            search: contain,
        }

        const action = await dispatch(doctorOpenAI(sendData));
        if (action.meta.requestStatus === "fulfilled") {
            aboutDoctor['about'] = `${action.payload}`;
            setAboutDoctor((prev) => { return { ...prev } });
        } else {
            errorMessage(action.error)
        }
    };

    return (
        <div className="bg-white p-20 overflow-auto" style={{ height: 'calc(100vh - 120px)' }}>
            <div className="text-greycolor fontroboto mb-3"> Write a brief introduction. Highlight your role, experience, languages spoken, best qualities, and key skills.</div>
            <Form layout="vertical">
                <Form.Item
                    label="Years of Experience"
                    className='fw-medium mb-20'
                    required>
                    <Input placeholder="12"
                        className="text-capitalize rounded-10px h-38"
                        value={aboutDoctor?.years_experience}
                        onChange={(e) => onChangeInput(e, 'years_experience')} />
                    <div className='position-absolute' style={{ top: 11, right: 11 }}>
                        <i className='icon-minus fs-16 p-2 cursor-pointer' onClick={decrement}></i>
                        <i className='icon-Add fs-16 p-2 cursor-pointer ms-4' onClick={increment}></i>
                    </div>
                </Form.Item>
            </Form>
            <hr className='mt-1' />
            <div className='fw-medium mb-20'>Languages Spoken</div>
            <div className='d-flex flex-wrap'>
                {aboutDoctor.hasOwnProperty('language') && aboutDoctor?.language && aboutDoctor?.language?.map((e, i) => {
                    return (
                        <div key={`${e + "-" + i}`} className={`language-chips border rounded-10px p-2 me-2 mb-2 h-100 cursor-pointer`} onClick={() => onLanguageClick(e)}>
                            <div className='d-flex align-items-cnter fontroboto' style={{ lineHeight: 1.3 }}>
                                {e}
                                <i className={`icon-Cross fs-18 ms-2`}></i>
                            </div>
                        </div>
                    )
                })}
                {languageList?.slice(0, 5)?.filter(e => aboutDoctor.hasOwnProperty('language') ? !aboutDoctor?.language?.includes(e?.title) : e?.title)?.map((e, i) => {
                    return (
                        <div key={`${e?.title + "-" + i}`} className={`${aboutDoctor.hasOwnProperty('language') && aboutDoctor?.language?.includes(e?.title) && 'language-chips'} border rounded-10px p-2 me-2 mb-2 h-100 cursor-pointer`} onClick={() => onLanguageClick(e?.title)}>
                            <div className='d-flex align-items-cnter fontroboto' style={{ lineHeight: 1.3 }}>
                                {e?.title}
                                <i className={`${aboutDoctor.hasOwnProperty('language') && aboutDoctor?.language?.includes(e?.title) ? 'icon-Cross' : 'icon-Add'} fs-18 ms-2`}></i>
                            </div>
                        </div>
                    )
                })}
                <div className="closable-chips rounded-10px p-2 me-2" onClick={handleLanguageMoreOptionsVisible}>
                    <div className='d-flex align-items-cnter fontroboto' style={{ lineHeight: 1.3 }}>
                        More
                        <i className='icon-right iconrotate270 fs-18 ms-2'></i>
                    </div>
                </div>
            </div>
            {languageMoreOptionsVisible && (
                <LanguageMoreModal
                    width='430px'
                    onClose={handleLanguageMoreOptionsVisible}
                    onClick={(e) => {
                        // setLanguageMoreOptionsVisible(false);
                        onLanguageClick(e?.title)
                    }}
                    selectedValue={aboutDoctor.hasOwnProperty('language') ? aboutDoctor?.language : []}
                    array={languageList.slice(5, languageList.length)} />
            )}
            <hr className='mt-1' />
            <div className='align-items-center d-flex'>
                <div className='title-common' style={{ flex: 1 }}>About Doctor</div>
                <Button type="button" onClick={getAIdata} className="btn btn-primary3" loading={ai_loading}>Generate AI</Button>
            </div>
            <div className="text-greycolor fontroboto my-3"> Write a brief introduction. Share your experience journey, major achievements, best qualities, and key skills. </div>
            <Input.TextArea rows="5"
                showCount
                maxLength={400}
                className="show-count-textarea text-capitalize textareaPlaceholder rounded-10px"
                value={aboutDoctor?.about}
                onChange={(e) => onChangeInput(e, 'about')} />
            <div className="text-greycolor fontroboto my-2"> Write maximum 400 characters </div>
        </div>
    );
}

export default React.memo(DWAboutDoctor);
