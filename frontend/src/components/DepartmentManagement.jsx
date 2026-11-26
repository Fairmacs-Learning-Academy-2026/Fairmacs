import { API_BASE_URL as SHARED_API_BASE_URL, authFetch } from '../utils/apiConfig';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {

  Building2,

  Users,

  BookOpen,

  RefreshCw,

  AlertCircle,

  Eye

} from 'lucide-react';



const API_BASE_URL = SHARED_API_BASE_URL;



export default function DepartmentManagement() {

  const [departments, setDepartments] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState('');



  useEffect(() => {

    loadDepartments();

  }, []);



  const loadDepartments = async () => {

    try {

      setLoading(true);

      setError('');



      const token =

        localStorage.getItem('fairmacs_token') ||

        localStorage.getItem('fairmacs_lms_token') ||

        '';



      const response = await authFetch(`${API_BASE_URL}/departments`, {

        method: 'GET',

        headers: {

          'Content-Type': 'application/json',

          ...(token ? { Authorization: `Bearer ${token}` } : {})

        }

      });



      if (!response.ok) {

        throw new Error(

          `Unable to load departments (${response.status})`

        );

      }



      const data = await response.json();



      setDepartments(Array.isArray(data) ? data : []);

    } catch (err) {

      console.error('Department loading failed:', err);

      setError(err.message || 'Unable to load departments.');

    } finally {

      setLoading(false);

    }

  };



  const totalEmployeesCount = departments.reduce(

    (total, department) =>

      total + Number(department.employeeCount || 0),

    0

  );



  const navigate = useNavigate();

  const handleViewDepartment = (departmentId) => {
    navigate(`/hr/departments/${departmentId}`);
  };



  return (

    <div

      className="animate-fade-in"

      style={{

        display: 'flex',

        flexDirection: 'column',

        gap: '1.75rem'

      }}

    >

      {/* Header */}

      <div

        style={{

          background:

            'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',

          padding: '1.75rem 2rem',

          borderRadius: '14px',

          color: 'white',

          display: 'flex',

          justifyContent: 'space-between',

          alignItems: 'center'

        }}

      >

        <div>

          <div

            style={{

              fontSize: '0.78rem',

              color: '#38bdf8',

              fontWeight: 700,

              textTransform: 'uppercase',

              letterSpacing: '1px'

            }}

          >

            Enterprise Department Management

          </div>



          <h1

            style={{

              fontSize: '1.6rem',

              fontWeight: 800,

              marginTop: '0.2rem'

            }}

          >

            Department Management Suite

          </h1>



          <p

            style={{

              color: '#94a3b8',

              fontSize: '0.88rem',

              marginTop: '0.35rem'

            }}

          >

            Manage departments, employees, and assigned learning

            programs.

          </p>

        </div>



        <div

          style={{

            background: 'rgba(56, 189, 248, 0.12)',

            border: '1px solid rgba(56, 189, 248, 0.3)',

            padding: '0.75rem 1.25rem',

            borderRadius: '12px',

            textAlign: 'center'

          }}

        >

          <div

            style={{

              fontSize: '1.4rem',

              fontWeight: 800,

              color: '#38bdf8'

            }}

          >

            {departments.length} Departments

          </div>



          <div

            style={{

              fontSize: '0.75rem',

              color: '#cbd5e1'

            }}

          >

            {totalEmployeesCount} Total Workforce

          </div>

        </div>

      </div>



      {/* Error */}

      {error && (

        <div

          style={{

            background: '#fef2f2',

            border: '1px solid #fecaca',

            color: '#b91c1c',

            padding: '1rem',

            borderRadius: '10px',

            display: 'flex',

            alignItems: 'center',

            gap: '0.6rem'

          }}

        >

          <AlertCircle size={18} />



          <span>{error}</span>



          <button

            onClick={loadDepartments}

            style={{

              marginLeft: 'auto',

              padding: '0.4rem 0.8rem',

              borderRadius: '7px',

              border: '1px solid #fecaca',

              background: 'white',

              cursor: 'pointer',

              fontWeight: 700

            }}

          >

            Retry

          </button>

        </div>

      )}



      {/* Department Table */}

      <div

        style={{

          background: 'white',

          borderRadius: '12px',

          padding: '1.5rem',

          border: '1px solid #e2e8f0',

          boxShadow: 'var(--shadow-sm)'

        }}

      >

        {/* Table Header */}

        <div

          style={{

            display: 'flex',

            justifyContent: 'space-between',

            alignItems: 'center',

            marginBottom: '1.25rem'

          }}

        >

          <div>

            <h2

              style={{

                fontSize: '1.15rem',

                fontWeight: 800,

                color: '#0f172a'

              }}

            >

              Fairmacs Departments

            </h2>



            <div

              style={{

                fontSize: '0.82rem',

                color: '#64748b',

                marginTop: '0.15rem'

              }}

            >

              Departments are loaded directly from the Fairmacs Learning Academy database.

            </div>

          </div>



          <button

            onClick={loadDepartments}

            disabled={loading}

            style={{

              display: 'inline-flex',

              alignItems: 'center',

              gap: '0.4rem',

              padding: '0.5rem 0.8rem',

              borderRadius: '8px',

              border: '1px solid #cbd5e1',

              background: 'white',

              cursor: loading ? 'not-allowed' : 'pointer',

              fontWeight: 700,

              color: '#334155'

            }}

          >

            <RefreshCw

              size={15}

              style={{

                animation: loading

                  ? 'spin 1s linear infinite'

                  : 'none'

              }}

            />



            Refresh

          </button>

        </div>



        {/* Loading */}

        {loading ? (

          <div

            style={{

              padding: '3rem',

              textAlign: 'center',

              color: '#64748b'

            }}

          >

            <RefreshCw

              size={25}

              style={{

                animation: 'spin 1s linear infinite',

                marginBottom: '0.75rem'

              }}

            />



            <div>Loading departments...</div>

          </div>

        ) : departments.length === 0 ? (

          /* Empty */

          <div

            style={{

              padding: '3rem',

              textAlign: 'center',

              color: '#64748b'

            }}

          >

            No departments found.

          </div>

        ) : (

          /* Table */

          <div

            style={{

              overflowX: 'auto'

            }}

          >

            <table

              style={{

                width: '100%',

                borderCollapse: 'collapse',

                textAlign: 'left'

              }}

            >

              <thead>

                <tr

                  style={{

                    background: '#f8fafc',

                    borderBottom: '1px solid #e2e8f0',

                    fontSize: '0.78rem',

                    color: '#64748b',

                    textTransform: 'uppercase'

                  }}

                >

                  <th style={{ padding: '0.75rem 1rem' }}>

                    Department

                  </th>



                  <th style={{ padding: '0.75rem 1rem' }}>

                    Department Lead

                  </th>



                  <th style={{ padding: '0.75rem 1rem' }}>

                    Employees

                  </th>



                  <th style={{ padding: '0.75rem 1rem' }}>

                    Assigned Courses

                  </th>



                  <th

                    style={{

                      padding: '0.75rem 1rem',

                      textAlign: 'right'

                    }}

                  >

                    Action

                  </th>

                </tr>

              </thead>



              <tbody>

                {departments.map((dept) => {

                  const departmentName =

                    dept.name || 'Unnamed Department';



                  const employeeCount = Number(

                    dept.employeeCount || 0

                  );



                  const assignedCoursesCount = Number(

                    dept.assignedCoursesCount || 0

                  );



                  return (

                    <tr

                      key={dept.id}

                      style={{

                        borderBottom: '1px solid #f1f5f9',

                        fontSize: '0.88rem'

                      }}

                    >

                      {/* Department */}

                      <td style={{ padding: '1rem' }}>

                        <div

                          style={{

                            fontWeight: 800,

                            color: '#0f172a',

                            display: 'flex',

                            alignItems: 'center',

                            gap: '0.4rem'

                          }}

                        >

                          <Building2

                            style={{

                              width: 16,

                              height: 16,

                              color: '#0284c7'

                            }}

                          />



                          {departmentName}

                        </div>

                      </td>



                      {/* Department Lead */}

                      <td

                        style={{

                          padding: '1rem',

                          color: '#475569',

                          fontWeight: 600

                        }}

                      >

                        {dept.headId || 'Not Assigned'}

                      </td>



                      {/* Employees */}

                      <td

                        style={{

                          padding: '1rem',

                          fontWeight: 700,

                          color: '#0f172a'

                        }}

                      >

                        <div

                          style={{

                            display: 'flex',

                            alignItems: 'center',

                            gap: '0.35rem'

                          }}

                        >

                          <Users size={15} />



                          {employeeCount}

                        </div>

                      </td>



                      {/* Assigned Courses */}

                      <td

                        style={{

                          padding: '1rem',

                          fontWeight: 700,

                          color: '#0f172a'

                        }}

                      >

                        <div

                          style={{

                            display: 'flex',

                            alignItems: 'center',

                            gap: '0.35rem'

                          }}

                        >

                          <BookOpen size={15} />



                          {assignedCoursesCount}

                        </div>

                      </td>



                      {/* Action */}

                      <td

                        style={{

                          padding: '1rem',

                          textAlign: 'right'

                        }}

                      >

                        <button

                          onClick={() =>

                            handleViewDepartment(dept.id)

                          }

                          style={{

                            display: 'inline-flex',

                            alignItems: 'center',

                            gap: '0.4rem',

                            padding: '0.5rem 0.9rem',

                            borderRadius: '8px',

                            border:

                              '1px solid rgba(2, 132, 199, 0.25)',

                            background: '#f0f9ff',

                            color: '#0369a1',

                            cursor: 'pointer',

                            fontWeight: 700,

                            fontSize: '0.78rem'

                          }}

                        >

                          <Eye size={14} />



                          View Department

                        </button>

                      </td>

                    </tr>

                  );

                })}

              </tbody>

            </table>

          </div>

        )}

      </div>

    </div>

  );

}